import sys
import os
import pandas as pd
import numpy as np
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.forecast_service import ForecastService


@pytest.fixture
def df_tendencia():
    n = 40
    dates = pd.date_range("2025-01-01", periods=n, freq="D")
    ventas = 1000 + np.arange(n) * 50 + np.random.RandomState(1).randn(n) * 10
    return pd.DataFrame({"Fecha": dates, "Ventas": ventas})


@pytest.fixture
def df_ruido():
    n = 40
    dates = pd.date_range("2025-01-01", periods=n, freq="D")
    ventas = np.random.RandomState(7).randn(n) * 500 + 2000
    return pd.DataFrame({"Fecha": dates, "Ventas": ventas})


def test_analyze_predictability_no_muta_el_df(df_ruido):
    original = df_ruido["Ventas"].tolist()
    ForecastService.analyze_predictability(df_ruido, "Fecha", "Ventas")
    assert df_ruido["Ventas"].tolist() == original


def test_analyze_predictability_tendencia_fuerte(df_tendencia):
    result = ForecastService.analyze_predictability(df_tendencia, "Fecha", "Ventas")
    assert result["can_predict"] is True
    assert result["confidence_level"] == "high"
    assert result["trend"] == "up"
    assert result["r_squared"] > 0.9


def test_analyze_predictabilidad_datos_constantes(df_tendencia):
    df = df_tendencia.copy()
    df["Ventas"] = 100.0
    result = ForecastService.analyze_predictability(df, "Fecha", "Ventas")
    assert result["can_predict"] is False
    assert "constantes" in result["reason"]


def test_analyze_predictability_pocos_datos():
    df = pd.DataFrame({
        "Fecha": pd.date_range("2025-01-01", periods=3, freq="D"),
        "Ventas": [1.0, 2.0, 3.0],
    })
    result = ForecastService.analyze_predictability(df, "Fecha", "Ventas")
    assert result["can_predict"] is False
    assert "Insuficientes" in result["reason"]


def test_analyze_predictability_columna_no_numerica():
    df = pd.DataFrame({
        "Fecha": pd.date_range("2025-01-01", periods=10, freq="D"),
        "Texto": ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
    })
    result = ForecastService.analyze_predictability(df, "Fecha", "Texto")
    assert result["can_predict"] is False


def test_analyze_predictability_columnas_inexistentes(df_tendencia):
    result = ForecastService.analyze_predictability(df_tendencia, "Fecha", "NoExiste")
    assert result["can_predict"] is False
    assert result["reason"] == "Columnas no encontradas"


def test_generate_forecast_linear(df_tendencia):
    result = ForecastService.generate_forecast(df_tendencia, "Fecha", "Ventas", periods=7, method="linear")
    assert result["success"] is True
    assert result["method_used"] == "linear"
    assert len(result["forecast_data"]) == 7
    assert len(result["confidence_interval"]["lower"]) == 7
    # La predicción debe crecer siguiendo la tendencia
    assert result["forecast_data"][-1]["y"] > result["forecast_data"][0]["y"]
    assert result["confidence_interval"]["lower"][-1]["y"] < result["confidence_interval"]["upper"][-1]["y"]


def test_generate_forecast_holt_winters(df_tendencia):
    result = ForecastService.generate_forecast(df_tendencia, "Fecha", "Ventas", periods=5, method="holt_winters")
    assert result["success"] is True
    assert result["method_used"] == "holt_winters"
    assert len(result["forecast_data"]) == 5


def test_generate_forecast_auto_fallback_si_holt_falla(df_tendencia):
    # Con el método auto, Holt-Winters debería funcionar con datos limpios
    result = ForecastService.generate_forecast(df_tendencia, "Fecha", "Ventas", periods=5, method="auto")
    assert result["success"] is True
    assert result["method_used"] in ("holt_winters", "linear")


def test_generate_forecast_insuficientes_datos():
    df = pd.DataFrame({
        "Fecha": pd.date_range("2025-01-01", periods=3, freq="D"),
        "Ventas": [1.0, 2.0, 3.0],
    })
    result = ForecastService.generate_forecast(df, "Fecha", "Ventas")
    assert result["success"] is False
    assert "Insuficientes" in result["error"]


def test_generate_forecast_confidence_no_negativa(df_ruido):
    result = ForecastService.generate_forecast(df_ruido, "Fecha", "Ventas", periods=5, method="linear")
    assert result["success"] is True
    assert result["metrics"]["confidence"] >= 0


def test_get_predictable_charts(df_tendencia):
    charts = [{"id": "c1", "title": "Tendencia", "xAxis": "Fecha", "yAxis": ["Ventas"]}]
    results = ForecastService.get_predictable_charts(df_tendencia, charts)
    assert results[0]["chart_id"] == "c1"
    assert len(results[0]["predictable_metrics"]) == 1
    assert results[0]["predictable_metrics"][0]["column"] == "Ventas"


def test_is_temporal_column():
    assert ForecastService.is_temporal_column("Fecha de venta") is True
    assert ForecastService.is_temporal_column("Region") is False
    assert ForecastService.is_temporal_column("RandomCol", ["2025-01-01", "2025-01-02", "2025-01-03"]) is True
