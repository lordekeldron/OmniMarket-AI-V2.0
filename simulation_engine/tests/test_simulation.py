from __future__ import annotations

import pandas as pd

from consumer_simulation import (
    Campanha,
    CondicoesPagamento,
    ContextoMacro,
    PersonaBase,
    gerar_audiencia_sintetica,
    simular_campanha,
)
from consumer_simulation.telemetry import IGNOROU


def _persona() -> PersonaBase:
    return PersonaBase(
        renda_mensal_media=4_000.0,
        endividamento_medio=0.35,
        aversao_risco_media=0.4,
        idade_media=34.0,
        sensibilidade_preco_media=0.45,
        dor_latente_media=0.75,
        categorias_interesse=("educacao_online",),
    )


def _campanha(**sobrescritas: object) -> Campanha:
    parametros: dict[str, object] = {
        "produto_categoria": "educacao_online",
        "preco_oferecido": 249.0,
        "condicoes_pagamento": CondicoesPagamento(),
        "angulos_copy": (0.35, 0.10, 0.25, 0.12, 0.18),
        "orcamento_midia": 2_000.0,
        "segmentacao_declarada": None,
        "cpm_estimado": 15.0,
    }
    parametros.update(sobrescritas)
    return Campanha(**parametros)  # type: ignore[arg-type]


def test_proporcoes_70_20_10_preservam_total_para_tamanho_nao_divisivel() -> None:
    audiencia = gerar_audiencia_sintetica(_persona(), 50_001, ContextoMacro(), seed=11)
    contagens = audiencia["segmento"].value_counts(sort=False)

    assert len(audiencia) == 50_001
    assert int(contagens["nucleo"]) == 35_001
    assert int(contagens["adjacente"]) == 10_000
    assert int(contagens["anti_persona"]) == 5_000


def test_anti_persona_tem_mais_ceticismo_e_curiosidade() -> None:
    audiencia = gerar_audiencia_sintetica(_persona(), 10_000, ContextoMacro(), seed=12)
    medias = audiencia.groupby("segmento", observed=True)[["ceticismo", "curiosidade"]].mean()

    assert medias.loc["anti_persona", "ceticismo"] > medias.loc["nucleo", "ceticismo"]
    assert medias.loc["anti_persona", "curiosidade"] > medias.loc["nucleo", "curiosidade"]


def test_macro_reduz_orcamento_disponivel_e_aumenta_sensibilidade() -> None:
    contexto_favoravel = ContextoMacro(0.01, 0.03, 0.7)
    contexto_adverso = ContextoMacro(0.12, 0.20, -0.7)
    favoravel = gerar_audiencia_sintetica(_persona(), 10_000, contexto_favoravel, seed=22)
    adverso = gerar_audiencia_sintetica(_persona(), 10_000, contexto_adverso, seed=22)

    assert adverso["renda_disponivel"].mean() < favoravel["renda_disponivel"].mean()
    assert adverso["sensibilidade_preco"].mean() > favoravel["sensibilidade_preco"].mean()


def test_segmentacao_declara_exposicao_apenas_para_coortes_alvo() -> None:
    audiencia = gerar_audiencia_sintetica(_persona(), 2_000, ContextoMacro(), seed=33)
    campanha = _campanha(segmentacao_declarada=("nucleo",), orcamento_midia=10_000.0)
    resultado = simular_campanha(audiencia, campanha, seed=44)
    individuos = resultado["individuos"]

    assert individuos is not None
    assert not individuos.loc[individuos["segmento"] != "nucleo", "exposto"].any()
    assert resultado["telemetria"]["desempenho_por_faixa"]["nucleo"]["segmentados"] > 0


def test_orcamento_zero_nao_expoe_e_status_final_e_ignorado() -> None:
    audiencia = gerar_audiencia_sintetica(_persona(), 500, ContextoMacro(), seed=55)
    resultado = simular_campanha(audiencia, _campanha(orcamento_midia=0.0), seed=66)

    assert resultado["telemetria"]["conversoes"] == 0
    assert resultado["telemetria"]["cac_estimado"] is None
    assert resultado["telemetria"]["roas_simulado"] is None
    assert resultado["individuos"]["status"].eq(IGNOROU).all()


def test_preco_alto_aumenta_rejeicoes_financeiras() -> None:
    audiencia = gerar_audiencia_sintetica(_persona(), 8_000, ContextoMacro(), seed=101)
    campanha_barata = _campanha(preco_oferecido=100.0, orcamento_midia=20_000.0)
    campanha_alta = _campanha(preco_oferecido=100_000.0, orcamento_midia=20_000.0)

    barata = simular_campanha(audiencia, campanha_barata, seed=202)["telemetria"]
    alta = simular_campanha(audiencia, campanha_alta, seed=202)["telemetria"]

    assert alta["motivos_rejeicao"]["Rejeitou por Preço"]["contagem"] > barata["motivos_rejeicao"]["Rejeitou por Preço"]["contagem"]


def test_mesma_semente_produz_status_e_telemetria_reproduziveis() -> None:
    audiencia = gerar_audiencia_sintetica(_persona(), 3_000, ContextoMacro(), seed=77)
    campanha = _campanha()
    primeiro = simular_campanha(audiencia, campanha, seed=88)
    segundo = simular_campanha(audiencia, campanha, seed=88)

    pd.testing.assert_series_equal(primeiro["individuos"]["status"], segundo["individuos"]["status"])
    assert primeiro["telemetria"] == segundo["telemetria"]


def test_somente_telemetria_pode_ser_retorna_sem_dataframe_individual() -> None:
    audiencia = gerar_audiencia_sintetica(_persona(), 100, ContextoMacro(), seed=99)
    resultado = simular_campanha(audiencia, _campanha(), seed=100, incluir_individuos=False)

    assert set(resultado) == {"telemetria"}
    assert resultado["telemetria"]["tamanho_amostra"] == 100
