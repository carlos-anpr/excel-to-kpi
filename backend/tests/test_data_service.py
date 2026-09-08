import sys
import os
import pandas as pd
import numpy as np
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.data_service import (
    DataService,
    detect_aggregation,
    sanitize_for_json,
)


@pytest.fixture
def ventas_df():
    np.random.seed(42)
    n = 30
    return pd.DataFrame({
        "Fecha": pd.date_range("2025-01-01", periods=n, freq="D"),
        "Region": np.random.choice(["Norte", "Sur", "Este"], n),
        "Ventas": np.random.randint(100, 5000, n).astype(float),
        "Unidades": np.random.randint(1, 50, n),
    })


def test_detect_aggregation_basico():
    assert detect_aggregation("edad", "int64") == "avg"
    assert detect_aggregation("Ventas", "int64") == "sum"
    assert detect_aggregation("Region", "object") == "count"
    assert detect_aggregation("Producto", "object") == "count"


def test_detect_aggregation_count_keywords():
    assert detect_aggregation("customer_id", "int64") == "count"


def test_dashboard_nueva_config(ventas_df, tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.data_service.UPLOAD_DIR", str(tmp_path))
    file_id = "test-dashboard"
    csv_path = tmp_path / f"{file_id}.csv"
    ventas_df.to_csv(csv_path, index=False)

    mapping = {
        "kpis": [
            {"column": "Ventas", "aggregation": "sum"},
            {"column": "Unidades", "aggregation": "sum"},
        ],
        "charts": [
            {"id": "c1", "title": "Ventas por dia", "xAxis": "Fecha", "yAxis": ["Ventas"], "order": 0},
            {"id": "c2", "title": "Ventas por region", "xAxis": "Region", "yAxis": ["Ventas"], "order": 1},
        ],
    }

    data = DataService.get_dashboard_data(file_id, mapping)

    assert len(data["kpis"]) == 2
    assert data["kpis"][0]["value"] == ventas_df["Ventas"].sum()
    assert data["kpis"][1]["value"] == ventas_df["Unidades"].sum()

    assert len(data["charts"]) == 2
    line_chart = data["charts"][0]
    assert line_chart["type"] == "line"
    assert len(line_chart["data"]) == 30
    bar_chart = data["charts"][1]
    assert bar_chart["type"] == "bar"
    assert len(bar_chart["data"]) == 3
    assert data["alerts"] == []


def test_dashboard_kpi_avg(ventas_df, tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.data_service.UPLOAD_DIR", str(tmp_path))
    csv_path = tmp_path / "test-avg.csv"
    ventas_df.to_csv(csv_path, index=False)

    mapping = {"kpis": [{"column": "Ventas", "aggregation": "avg"}], "charts": []}
    data = DataService.get_dashboard_data("test-avg", mapping)
    assert data["kpis"][0]["value"] == round(ventas_df["Ventas"].mean(), 1)
    assert data["kpis"][0]["type"] == "avg"


def test_dashboard_config_antigua(ventas_df, tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.data_service.UPLOAD_DIR", str(tmp_path))
    csv_path = tmp_path / "test-legacy.csv"
    ventas_df.to_csv(csv_path, index=False)

    mapping = {"Fecha": "date", "Region": "category", "Ventas": "number"}
    data = DataService.get_dashboard_data("test-legacy", mapping)

    assert len(data["kpis"]) == 1
    assert data["kpis"][0]["label"] == "Total Ventas"
    chart_types = {c["type"] for c in data["charts"]}
    assert "line" in chart_types
    assert "bar" in chart_types


def test_dashboard_alertas(ventas_df, tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.data_service.UPLOAD_DIR", str(tmp_path))
    csv_path = tmp_path / "test-alerts.csv"
    ventas_df.to_csv(csv_path, index=False)

    mapping = {"kpis": [], "charts": []}
    rules = [{"column": "Ventas", "operator": ">", "threshold": 4000}]
    data = DataService.get_dashboard_data("test-alerts", mapping, alert_rules=rules)

    expected = (ventas_df["Ventas"] > 4000).sum()
    assert data["alerts"][0]["count"] == expected


def test_dashboard_archivo_inexistente():
    with pytest.raises(FileNotFoundError):
        DataService.get_dashboard_data("id-que-no-existe", {"kpis": [], "charts": []})


def test_sanitize_for_json():
    assert sanitize_for_json(float("nan")) is None
    assert sanitize_for_json(float("inf")) is None
    assert sanitize_for_json(np.float64(1.5)) == 1.5
    assert sanitize_for_json({"a": [float("nan")]}) == {"a": [None]}


def test_find_file(tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.data_service.UPLOAD_DIR", str(tmp_path))
    (tmp_path / "abc123.csv").write_text("a,b\n1,2\n")
    assert DataService.find_file("abc123") == str(tmp_path / "abc123.csv")
    assert DataService.find_file("noexiste") is None
