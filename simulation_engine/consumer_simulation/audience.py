"""Geração vetorizada de perfis sintéticos e ajuste ao contexto macro."""

from __future__ import annotations

import numpy as np
import pandas as pd

from .models import ANGULOS_COPY, SEGMENTOS, ContextoMacro, PersonaBase


def _alocar_tamanhos(tamanho: int) -> tuple[int, int, int]:
    """Aplica o método dos maiores restos para preservar o total da amostra."""
    proporcoes = np.array([0.70, 0.20, 0.10], dtype=np.float64)
    exatos = proporcoes * tamanho
    tamanhos = np.floor(exatos).astype(np.int64)
    faltantes = tamanho - int(tamanhos.sum())
    if faltantes:
        ordem = np.argsort(-(exatos - tamanhos), kind="stable")
        tamanhos[ordem[:faltantes]] += 1
    return tuple(int(valor) for valor in tamanhos)


def _beta_ao_redor(
    rng: np.random.Generator,
    medias: float | np.ndarray,
    concentracao: float,
    tamanho: int | tuple[int, ...],
) -> np.ndarray:
    medias_array = np.clip(np.asarray(medias, dtype=np.float64), 0.01, 0.99)
    alfa = medias_array * concentracao
    beta = (1.0 - medias_array) * concentracao
    return rng.beta(alfa, beta, size=tamanho)


def gerar_audiencia_sintetica(
    persona_base: PersonaBase,
    tamanho_amostra: int,
    contexto_macro: ContextoMacro,
    *,
    seed: int | None = None,
) -> pd.DataFrame:
    """Gera indivíduos sintéticos em lote, sem dados pessoais reais.

    O número de indivíduos por coorte usa o método dos maiores restos, mantendo
    a proporção 70/20/10 o mais próxima possível para qualquer tamanho inteiro.
    """
    if isinstance(tamanho_amostra, bool) or not isinstance(tamanho_amostra, int) or tamanho_amostra < 1:
        raise ValueError("tamanho_amostra deve ser um inteiro positivo.")

    rng = np.random.default_rng(seed)
    n_nucleo, n_adjacente, n_anti = _alocar_tamanhos(tamanho_amostra)
    segmentos = np.concatenate(
        (
            np.full(n_nucleo, SEGMENTOS[0], dtype=object),
            np.full(n_adjacente, SEGMENTOS[1], dtype=object),
            np.full(n_anti, SEGMENTOS[2], dtype=object),
        )
    )
    rng.shuffle(segmentos)

    # Inflação/juros reduzem orçamento; notícias positivas de poder de compra
    # moderam o efeito. O delta de sensibilidade opera na mesma direção inversa.
    fator_orcamento = float(
        np.clip(
            1.0 - 0.65 * contexto_macro.inflacao_anual - 0.20 * contexto_macro.juros_anual
            + 0.10 * contexto_macro.indice_poder_compra,
            0.45,
            1.20,
        )
    )
    delta_sensibilidade = float(
        np.clip(
            1.60 * contexto_macro.inflacao_anual + 0.45 * contexto_macro.juros_anual
            - 0.20 * contexto_macro.indice_poder_compra,
            -0.25,
            0.50,
        )
    )

    n = tamanho_amostra
    idade = np.empty(n, dtype=np.float64)
    renda = np.empty(n, dtype=np.float64)
    endividamento = np.empty(n, dtype=np.float64)
    aversao_risco = np.empty(n, dtype=np.float64)
    sensibilidade_preco = np.empty(n, dtype=np.float64)
    dor_latente = np.empty(n, dtype=np.float64)
    afinidade_anuncio = np.empty(n, dtype=np.float64)
    afinidade_segmentacao = np.empty(n, dtype=np.float64)
    afinidade_categoria = np.empty(n, dtype=np.float64)
    ceticismo = np.empty(n, dtype=np.float64)
    curiosidade = np.empty(n, dtype=np.float64)
    gatilhos = np.empty((n, len(ANGULOS_COPY)), dtype=np.float64)

    gatilhos_persona = np.asarray(persona_base.gatilhos_base, dtype=np.float64)
    configuracoes = {
        "nucleo": {
            "fator_renda": 1.0,
            "sigma_extra": 0.0,
            "divida_extra": 0.0,
            "risco_extra": 0.0,
            "preco_extra": 0.0,
            "dor": persona_base.dor_latente_media,
            "afinidade_anuncio": persona_base.afinidade_anuncio_media,
            "afinidade_segmentacao": 0.78,
            "afinidade_categoria": 0.74,
            "ceticismo": 0.28,
            "curiosidade": 0.48,
            "gatilhos": gatilhos_persona,
            "concentracao_gatilhos": 16.0,
        },
        "adjacente": {
            "fator_renda": 1.0,
            "sigma_extra": 0.10,
            "divida_extra": 0.10,
            "risco_extra": 0.12,
            "preco_extra": 0.10,
            "dor": max(0.42, persona_base.dor_latente_media - 0.16),
            "afinidade_anuncio": 0.58,
            "afinidade_segmentacao": 0.57,
            "afinidade_categoria": 0.55,
            "ceticismo": 0.47,
            "curiosidade": 0.62,
            "gatilhos": np.clip(gatilhos_persona * 0.76 + 0.12, 0.05, 0.95),
            "concentracao_gatilhos": 12.0,
        },
        "anti_persona": {
            "fator_renda": 0.90,
            "sigma_extra": 0.14,
            "divida_extra": 0.24,
            "risco_extra": 0.34,
            "preco_extra": 0.24,
            "dor": 0.22,
            "afinidade_anuncio": 0.46,
            "afinidade_segmentacao": 0.28,
            "afinidade_categoria": 0.30,
            "ceticismo": 0.84,
            "curiosidade": 0.82,
            "gatilhos": np.array([0.78, 0.27, 0.25, 0.34, 0.28]),
            "concentracao_gatilhos": 10.0,
        },
    }

    for segmento, config in configuracoes.items():
        indices = np.flatnonzero(segmentos == segmento)
        quantidade = len(indices)
        if quantidade == 0:
            continue

        fator_renda = config["fator_renda"]
        if segmento == "adjacente":
            fator_renda = rng.choice((0.78, 1.22), size=quantidade)
        sigma = persona_base.dispersao_renda + config["sigma_extra"]
        renda[indices] = rng.lognormal(
            mean=np.log(persona_base.renda_mensal_media * fator_renda) - 0.5 * sigma**2,
            sigma=sigma,
            size=quantidade,
        )

        idade_delta = rng.choice((-7.0, 7.0), size=quantidade) if segmento == "adjacente" else 0.0
        idade[indices] = np.clip(
            rng.normal(persona_base.idade_media + idade_delta, 4.0 if segmento != "nucleo" else 3.0),
            18.0,
            90.0,
        )

        media_divida = min(0.96, persona_base.endividamento_medio + config["divida_extra"])
        endividamento[indices] = np.clip(rng.normal(media_divida, 0.12, quantidade), 0.0, 0.98)
        media_risco = min(0.98, persona_base.aversao_risco_media + config["risco_extra"])
        aversao_risco[indices] = np.clip(rng.normal(media_risco, 0.13, quantidade), 0.0, 1.0)
        sensibilidade_preco[indices] = np.clip(
            rng.normal(
                persona_base.sensibilidade_preco_media
                + 0.18 * endividamento[indices]
                + config["preco_extra"]
                + delta_sensibilidade,
                0.10,
                quantidade,
            ),
            0.0,
            1.0,
        )

        dor_latente[indices] = _beta_ao_redor(rng, config["dor"], 12.0, quantidade)
        afinidade_anuncio[indices] = _beta_ao_redor(rng, config["afinidade_anuncio"], 12.0, quantidade)
        afinidade_segmentacao[indices] = _beta_ao_redor(rng, config["afinidade_segmentacao"], 14.0, quantidade)
        afinidade_categoria[indices] = _beta_ao_redor(rng, config["afinidade_categoria"], 12.0, quantidade)
        ceticismo[indices] = _beta_ao_redor(rng, config["ceticismo"], 12.0, quantidade)
        curiosidade[indices] = _beta_ao_redor(rng, config["curiosidade"], 12.0, quantidade)
        gatilhos[indices] = _beta_ao_redor(
            rng,
            config["gatilhos"],
            config["concentracao_gatilhos"],
            (quantidade, len(ANGULOS_COPY)),
        )

    renda_disponivel = renda * 0.28 * (1.0 - endividamento) * fator_orcamento
    dados = {
        "id": np.arange(n, dtype=np.int64),
        "segmento": pd.Categorical(segmentos, categories=SEGMENTOS),
        "idade": idade,
        "renda_mensal": renda,
        "endividamento": endividamento,
        "aversao_risco": aversao_risco,
        "sensibilidade_preco": sensibilidade_preco,
        "renda_disponivel": renda_disponivel,
        "dor_latente": dor_latente,
        "afinidade_anuncio": afinidade_anuncio,
        "afinidade_segmentacao": afinidade_segmentacao,
        "afinidade_categoria": afinidade_categoria,
        "ceticismo": ceticismo,
        "curiosidade": curiosidade,
    }
    dados.update({f"gatilho_{nome}": gatilhos[:, coluna] for coluna, nome in enumerate(ANGULOS_COPY)})
    audiencia = pd.DataFrame(dados)
    audiencia.attrs["contexto_macro"] = {
        "inflacao_anual": contexto_macro.inflacao_anual,
        "juros_anual": contexto_macro.juros_anual,
        "indice_poder_compra": contexto_macro.indice_poder_compra,
    }
    audiencia.attrs["fator_orcamento_macro"] = fator_orcamento
    audiencia.attrs["delta_sensibilidade_macro"] = delta_sensibilidade
    audiencia.attrs["categorias_interesse"] = persona_base.categorias_interesse
    return audiencia
