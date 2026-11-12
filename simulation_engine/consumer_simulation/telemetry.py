"""Agregação de métricas de negócio em estruturas serializáveis."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from .models import Campanha, SEGMENTOS

CONVERTIDO = "Convertido"
REJEITOU_PRECO = "Rejeitou por Preço"
REJEITOU_DESCONFIANCA = "Rejeitou por Desconfiança"
IGNOROU = "Ignorou/Cego ao Anúncio"
STATUS_FINAIS = (CONVERTIDO, REJEITOU_PRECO, REJEITOU_DESCONFIANCA, IGNOROU)


def _proporcao(numerador: int, denominador: int) -> float | None:
    return round(numerador / denominador, 6) if denominador else None


def construir_telemetria(
    campanha: Campanha,
    audiencia: pd.DataFrame,
    status: np.ndarray,
    exposto: np.ndarray,
    atencao: np.ndarray,
    segmentado: np.ndarray,
    impressoes_estimadas: float,
    fator_orcamento_macro: float,
) -> dict[str, Any]:
    tamanho = len(audiencia)
    contagens_status = {nome: int(np.count_nonzero(status == nome)) for nome in STATUS_FINAIS}
    conversoes = contagens_status[CONVERTIDO]
    nao_convertidos = tamanho - conversoes
    receita_bruta = conversoes * campanha.preco_oferecido
    investimento = campanha.orcamento_midia
    receita_roas = receita_bruta / investimento if investimento > 0 else None
    cac = investimento / conversoes if conversoes > 0 else None

    motivos = {}
    for nome in (REJEITOU_PRECO, REJEITOU_DESCONFIANCA, IGNOROU):
        quantidade = contagens_status[nome]
        motivos[nome] = {
            "contagem": quantidade,
            "proporcao_amostra": _proporcao(quantidade, tamanho),
            "proporcao_nao_convertidos": _proporcao(quantidade, nao_convertidos),
        }

    desempenho_por_faixa = {}
    segmento_amostra = audiencia["segmento"].astype(str).to_numpy()
    curiosidade_amostra = audiencia["curiosidade"].to_numpy(dtype=np.float64)
    limiar_curiosidade = 0.65
    for segmento in SEGMENTOS:
        mascara = segmento_amostra == segmento
        total_segmento = int(np.count_nonzero(mascara))
        conversoes_segmento = int(np.count_nonzero(mascara & (status == CONVERTIDO)))
        mascara_atencao = mascara & atencao
        atencoes_segmento = int(np.count_nonzero(mascara_atencao))
        mascara_curiosos = mascara_atencao & (curiosidade_amostra >= limiar_curiosidade)
        curiosos_atentos = int(np.count_nonzero(mascara_curiosos))
        conversoes_curiosos = int(np.count_nonzero(mascara_curiosos & (status == CONVERTIDO)))
        curiosos_sem_compra = curiosos_atentos - conversoes_curiosos
        desempenho_por_faixa[segmento] = {
            "amostra": total_segmento,
            "segmentados": int(np.count_nonzero(mascara & segmentado)),
            "expostos": int(np.count_nonzero(mascara & exposto)),
            "atencoes": atencoes_segmento,
            "atentos_sem_compra": max(0, atencoes_segmento - conversoes_segmento),
            "conversoes": conversoes_segmento,
            "taxa_conversao_real": _proporcao(conversoes_segmento, total_segmento),
            "taxa_conversao_sobre_atentos": _proporcao(conversoes_segmento, atencoes_segmento),
            "taxa_atencao": _proporcao(atencoes_segmento, total_segmento),
            "curiosos_atentos": curiosos_atentos,
            "conversoes_entre_curiosos": conversoes_curiosos,
            "curiosos_sem_compra": curiosos_sem_compra,
            "proporcao_curiosos_sem_compra": _proporcao(curiosos_sem_compra, curiosos_atentos),
        }

    return {
        "produto_categoria": campanha.produto_categoria,
        "tamanho_amostra": tamanho,
        "investimento_midia": round(investimento, 2),
        "cpm_estimado": round(campanha.cpm_estimado, 2),
        "impressoes_estimadas": round(impressoes_estimadas, 2),
        "pessoas_segmentadas": int(np.count_nonzero(segmentado)),
        "pessoas_expostas": int(np.count_nonzero(exposto)),
        "pessoas_atentas": int(np.count_nonzero(atencao)),
        "conversoes": conversoes,
        "receita_bruta_simulada": round(receita_bruta, 2),
        "taxa_conversao_real": _proporcao(conversoes, tamanho),
        "taxa_conversao_real_pct": round(100.0 * conversoes / tamanho, 4) if tamanho else 0.0,
        "cac_estimado": round(cac, 2) if cac is not None else None,
        "roas_simulado": round(receita_roas, 4) if receita_roas is not None else None,
        "base_roas": "receita bruta, sem descontar custo do produto ou margem",
        "limiar_curiosidade": limiar_curiosidade,
        "distribuicao_status": {
            nome: {
                "contagem": quantidade,
                "proporcao_amostra": _proporcao(quantidade, tamanho),
            }
            for nome, quantidade in contagens_status.items()
        },
        "motivos_rejeicao": motivos,
        "desempenho_por_faixa": desempenho_por_faixa,
        "fator_orcamento_macro": round(fator_orcamento_macro, 6),
    }
