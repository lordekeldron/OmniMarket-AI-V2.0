"""Exemplo reproduzível: preço à vista versus parcelamento."""

from __future__ import annotations

import argparse
import json

from . import (
    Campanha,
    CondicoesPagamento,
    ContextoMacro,
    PersonaBase,
    gerar_audiencia_sintetica,
    simular_campanha,
)


def executar(tamanho_amostra: int = 50_000) -> dict[str, dict[str, object]]:
    persona = PersonaBase(
        renda_mensal_media=4_200.0,
        endividamento_medio=0.34,
        aversao_risco_media=0.42,
        idade_media=34.0,
        sensibilidade_preco_media=0.48,
        dor_latente_media=0.76,
        afinidade_anuncio_media=0.66,
        categorias_interesse=("educacao_online", "marketing_digital"),
        gatilhos_base=(0.72, 0.30, 0.76, 0.43, 0.58),
    )
    macro = ContextoMacro(
        inflacao_anual=0.048,
        juros_anual=0.115,
        indice_poder_compra=-0.20,
    )
    audiencia = gerar_audiencia_sintetica(persona, tamanho_amostra, macro, seed=2026)

    base = {
        "produto_categoria": "educacao_online",
        "condicoes_pagamento": CondicoesPagamento(parcelas=1),
        "angulos_copy": (0.35, 0.08, 0.28, 0.12, 0.17),
        "orcamento_midia": 3_000.0,
        "segmentacao_declarada": ("nucleo", "adjacente", "anti_persona"),
        "cpm_estimado": 18.0,
    }
    campanhas = {
        "desconto_a_vista": Campanha(preco_oferecido=1_499.0, **base),
        "parcelamento_12x": Campanha(
            preco_oferecido=1_798.8,
            condicoes_pagamento=CondicoesPagamento(parcelas=12),
            **{chave: valor for chave, valor in base.items() if chave != "condicoes_pagamento"},
        ),
    }

    # A mesma semente reduz ruído entre alternativas (common random numbers).
    return {
        nome: simular_campanha(audiencia, campanha, seed=77, incluir_individuos=False)["telemetria"]
        for nome, campanha in campanhas.items()
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--amostra", type=int, default=50_000, help="Tamanho da audiência sintética.")
    argumentos = parser.parse_args()
    resultados = executar(argumentos.amostra)
    print(json.dumps(resultados, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
