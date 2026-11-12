"""Funil de campanha com operações NumPy vetorizadas por indivíduo."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from .models import ANGULOS_COPY, Campanha
from .telemetry import (
    CONVERTIDO,
    IGNOROU,
    REJEITOU_DESCONFIANCA,
    REJEITOU_PRECO,
    construir_telemetria,
)

_COLUNAS_OBRIGATORIAS = {
    "id",
    "segmento",
    "renda_mensal",
    "renda_disponivel",
    "endividamento",
    "aversao_risco",
    "sensibilidade_preco",
    "dor_latente",
    "afinidade_anuncio",
    "afinidade_segmentacao",
    "afinidade_categoria",
    "ceticismo",
    "curiosidade",
    *(f"gatilho_{nome}" for nome in ANGULOS_COPY),
}


def _sigmoide(valor: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(valor, -30.0, 30.0)))


def _pagamento_mensal(campanha: Campanha) -> float:
    condicoes = campanha.condicoes_pagamento
    principal = campanha.preco_oferecido * (1.0 - condicoes.entrada_percentual)
    if condicoes.parcelas == 1:
        return principal
    if condicoes.juros_mensal == 0:
        return principal / condicoes.parcelas
    taxa = condicoes.juros_mensal
    return principal * taxa / (1.0 - (1.0 + taxa) ** (-condicoes.parcelas))


def simular_campanha(
    audiencia: pd.DataFrame,
    campanha: Campanha,
    *,
    seed: int | None = None,
    incluir_individuos: bool = True,
) -> dict[str, Any]:
    """Simula exposição, atenção, confiança e capacidade de compra em lote.

    Retorna telemetria serializável e, por padrão, um DataFrame enxuto com o
    status final de cada perfil. Use ``incluir_individuos=False`` em pipelines
    que precisam apenas das métricas agregadas.
    """
    if not isinstance(audiencia, pd.DataFrame):
        raise TypeError("audiencia deve ser um pandas.DataFrame.")
    faltantes = _COLUNAS_OBRIGATORIAS.difference(audiencia.columns)
    if faltantes:
        raise ValueError(f"Colunas ausentes na audiência: {', '.join(sorted(faltantes))}.")
    if audiencia.empty:
        raise ValueError("audiencia não pode estar vazia.")

    rng = np.random.default_rng(seed)
    n = len(audiencia)
    segmentos = audiencia["segmento"].astype(str).to_numpy()
    if campanha.segmentacao_declarada is None:
        segmentado = np.ones(n, dtype=bool)
    else:
        segmentado = np.isin(segmentos, campanha.segmentacao_declarada)

    afinidade = np.clip(audiencia["afinidade_segmentacao"].to_numpy(dtype=np.float64), 0.0, 1.0)
    pessoas_segmentadas = int(np.count_nonzero(segmentado))
    impressoes_estimadas = campanha.orcamento_midia / campanha.cpm_estimado * 1000.0
    alcance_base = (
        -np.expm1(-impressoes_estimadas / pessoas_segmentadas) if pessoas_segmentadas else 0.0
    )
    prob_exposicao = np.where(segmentado, alcance_base * (0.25 + 0.75 * afinidade), 0.0)
    exposto = rng.random(n) < np.clip(prob_exposicao, 0.0, 1.0)

    prob_atencao = np.clip(
        0.02
        + 0.10 * audiencia["afinidade_anuncio"].to_numpy(dtype=np.float64)
        + 0.08 * audiencia["curiosidade"].to_numpy(dtype=np.float64),
        0.01,
        0.35,
    )
    atencao = exposto & (rng.random(n) < prob_atencao)

    colunas_gatilhos = [f"gatilho_{nome}" for nome in ANGULOS_COPY]
    matriz_gatilhos = audiencia[colunas_gatilhos].to_numpy(dtype=np.float64, copy=False)
    pesos_copy = np.asarray(campanha.pesos_copy_normalizados, dtype=np.float64)
    aderencia_copy = np.clip(matriz_gatilhos @ pesos_copy, 0.0, 1.0)

    afinidade_categoria = audiencia["afinidade_categoria"].to_numpy(dtype=np.float64)
    categorias_interesse = tuple(audiencia.attrs.get("categorias_interesse", ()))
    if categorias_interesse and campanha.produto_categoria.casefold() not in {
        categoria.casefold() for categoria in categorias_interesse
    }:
        afinidade_categoria = afinidade_categoria * 0.65
    afinidade_categoria = np.clip(afinidade_categoria, 0.0, 1.0)

    dor = audiencia["dor_latente"].to_numpy(dtype=np.float64)
    ceticismo = audiencia["ceticismo"].to_numpy(dtype=np.float64)
    aversao_risco = audiencia["aversao_risco"].to_numpy(dtype=np.float64)
    sensibilidade = audiencia["sensibilidade_preco"].to_numpy(dtype=np.float64)
    escore_confianca = (
        -1.10
        + 2.20 * (aderencia_copy - 0.50)
        + 1.10 * (dor - 0.50)
        - 3.00 * (ceticismo - 0.50)
        - 0.70 * (aversao_risco - 0.50)
        + 0.55 * (afinidade_categoria - 0.50)
    )
    prob_confianca = np.clip(_sigmoide(escore_confianca), 0.01, 0.99)
    confiou = atencao & (rng.random(n) < prob_confianca)

    prob_intencao = np.clip(
        _sigmoide(
            -2.40
            + 2.00 * (aderencia_copy - 0.50)
            + 1.10 * (dor - 0.50)
            - 1.00 * (sensibilidade - 0.50)
            - 0.80 * (aversao_risco - 0.50)
        ),
        0.01,
        0.60,
    )
    qualificado_psicologicamente = confiou & (rng.random(n) < prob_intencao)

    pagamento_mensal = _pagamento_mensal(campanha)
    fator_macro = float(audiencia.attrs.get("fator_orcamento_macro", 1.0))
    renda_disponivel = audiencia["renda_disponivel"].to_numpy(dtype=np.float64)
    renda_mensal = audiencia["renda_mensal"].to_numpy(dtype=np.float64)
    endividamento = audiencia["endividamento"].to_numpy(dtype=np.float64)

    choque_capacidade = rng.lognormal(mean=0.0, sigma=0.16, size=n)
    capacidade_mensal = renda_disponivel * choque_capacidade
    limite_esforco = 0.45 + 0.35 * sensibilidade + 0.20 * endividamento
    parcela_mensal = capacidade_mensal / max(pagamento_mensal, 1e-9)
    passou_parcela = parcela_mensal >= limite_esforco

    valor_entrada = campanha.preco_oferecido * campanha.condicoes_pagamento.entrada_percentual
    capacidade_entrada = (
        renda_mensal
        * np.clip(0.45 - 0.25 * endividamento, 0.05, 0.45)
        * fator_macro
        * rng.lognormal(mean=0.0, sigma=0.18, size=n)
    )
    passou_entrada = valor_entrada <= capacidade_entrada
    passou_financeiro = passou_parcela & passou_entrada

    status = np.full(n, IGNOROU, dtype=object)
    status[atencao & ~qualificado_psicologicamente] = REJEITOU_DESCONFIANCA
    status[qualificado_psicologicamente & ~passou_financeiro] = REJEITOU_PRECO
    converteu = qualificado_psicologicamente & passou_financeiro
    status[converteu] = CONVERTIDO

    telemetria = construir_telemetria(
        campanha=campanha,
        audiencia=audiencia,
        status=status,
        exposto=exposto,
        atencao=atencao,
        segmentado=segmentado,
        impressoes_estimadas=impressoes_estimadas,
        fator_orcamento_macro=fator_macro,
    )
    resultado: dict[str, Any] = {"telemetria": telemetria}
    if incluir_individuos:
        resultado["individuos"] = pd.DataFrame(
            {
                "id": audiencia["id"].to_numpy(copy=False),
                "segmento": segmentos,
                "segmentado": segmentado,
                "exposto": exposto,
                "atencao": atencao,
                "aderencia_copy": aderencia_copy,
                "probabilidade_confianca": prob_confianca,
                "probabilidade_intencao": prob_intencao,
                "qualificado_psicologicamente": qualificado_psicologicamente,
                "pagamento_mensal_estimado": pagamento_mensal,
                "capacidade_mensal_estimada": capacidade_mensal,
                "status": status,
            }
        )
    return resultado
