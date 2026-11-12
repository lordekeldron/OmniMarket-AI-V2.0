"""Modelos tipados e validação das entradas da simulação."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Sequence

ANGULOS_COPY = (
    "preco_desconto",
    "status",
    "prova_social",
    "urgencia_escassez",
    "autoridade",
)

SEGMENTOS = ("nucleo", "adjacente", "anti_persona")


def _validar_intervalo(nome: str, valor: float, minimo: float, maximo: float) -> None:
    if not math.isfinite(valor) or not minimo <= valor <= maximo:
        raise ValueError(f"{nome} deve estar entre {minimo} e {maximo}.")


@dataclass(frozen=True, slots=True)
class PersonaBase:
    """Parâmetros da persona em unidades monetárias mensais e proporções."""

    renda_mensal_media: float
    endividamento_medio: float = 0.30
    aversao_risco_media: float = 0.45
    idade_media: float = 35.0
    sensibilidade_preco_media: float = 0.50
    dor_latente_media: float = 0.70
    afinidade_anuncio_media: float = 0.65
    dispersao_renda: float = 0.22
    gatilhos_base: tuple[float, ...] = (0.62, 0.38, 0.64, 0.42, 0.48)
    categorias_interesse: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not math.isfinite(self.renda_mensal_media) or self.renda_mensal_media <= 0:
            raise ValueError("renda_mensal_media deve ser um número positivo.")
        for nome in (
            "endividamento_medio",
            "aversao_risco_media",
            "sensibilidade_preco_media",
            "dor_latente_media",
            "afinidade_anuncio_media",
        ):
            _validar_intervalo(nome, float(getattr(self, nome)), 0.0, 1.0)
        _validar_intervalo("idade_media", self.idade_media, 18.0, 100.0)
        if not math.isfinite(self.dispersao_renda) or not 0.01 <= self.dispersao_renda <= 1.0:
            raise ValueError("dispersao_renda deve estar entre 0.01 e 1.0.")

        gatilhos = tuple(float(valor) for valor in self.gatilhos_base)
        if len(gatilhos) != len(ANGULOS_COPY):
            raise ValueError(f"gatilhos_base deve conter {len(ANGULOS_COPY)} valores.")
        for valor in gatilhos:
            _validar_intervalo("gatilhos_base", valor, 0.0, 1.0)
        object.__setattr__(self, "gatilhos_base", gatilhos)
        object.__setattr__(
            self,
            "categorias_interesse",
            tuple(str(categoria).strip() for categoria in self.categorias_interesse if str(categoria).strip()),
        )


@dataclass(frozen=True, slots=True)
class ContextoMacro:
    """Cenário macro; taxas são decimais (0.05 representa 5% ao ano)."""

    inflacao_anual: float = 0.04
    juros_anual: float = 0.10
    indice_poder_compra: float = 0.0

    def __post_init__(self) -> None:
        _validar_intervalo("inflacao_anual", self.inflacao_anual, 0.0, 5.0)
        _validar_intervalo("juros_anual", self.juros_anual, 0.0, 5.0)
        _validar_intervalo("indice_poder_compra", self.indice_poder_compra, -1.0, 1.0)


@dataclass(frozen=True, slots=True)
class CondicoesPagamento:
    """Condições financeiras; entrada e juros são proporções, não percentuais inteiros."""

    parcelas: int = 1
    entrada_percentual: float = 0.0
    juros_mensal: float = 0.0

    def __post_init__(self) -> None:
        if isinstance(self.parcelas, bool) or not isinstance(self.parcelas, int) or self.parcelas < 1:
            raise ValueError("parcelas deve ser um inteiro maior ou igual a 1.")
        _validar_intervalo("entrada_percentual", self.entrada_percentual, 0.0, 1.0)
        _validar_intervalo("juros_mensal", self.juros_mensal, 0.0, 2.0)


@dataclass(frozen=True, slots=True)
class Campanha:
    """Parâmetros enviados pela IA de marketing para uma simulação."""

    produto_categoria: str
    preco_oferecido: float
    condicoes_pagamento: CondicoesPagamento = field(default_factory=CondicoesPagamento)
    angulos_copy: Sequence[float] = (0.25, 0.15, 0.25, 0.15, 0.20)
    orcamento_midia: float = 0.0
    segmentacao_declarada: tuple[str, ...] | None = None
    cpm_estimado: float = 15.0

    def __post_init__(self) -> None:
        if not self.produto_categoria.strip():
            raise ValueError("produto_categoria não pode ser vazio.")
        if not math.isfinite(self.preco_oferecido) or self.preco_oferecido <= 0:
            raise ValueError("preco_oferecido deve ser positivo.")
        if not math.isfinite(self.orcamento_midia) or self.orcamento_midia < 0:
            raise ValueError("orcamento_midia não pode ser negativo.")
        if not math.isfinite(self.cpm_estimado) or self.cpm_estimado <= 0:
            raise ValueError("cpm_estimado deve ser positivo.")

        pesos = tuple(float(valor) for valor in self.angulos_copy)
        if len(pesos) != len(ANGULOS_COPY):
            raise ValueError(f"angulos_copy deve conter {len(ANGULOS_COPY)} pesos.")
        if any(not math.isfinite(valor) or valor < 0 for valor in pesos) or sum(pesos) <= 0:
            raise ValueError("angulos_copy deve conter pesos finitos, não negativos e com soma positiva.")
        object.__setattr__(self, "angulos_copy", pesos)

        if self.segmentacao_declarada is not None:
            segmentos = tuple(dict.fromkeys(str(item).strip().casefold() for item in self.segmentacao_declarada))
            desconhecidos = set(segmentos).difference(SEGMENTOS)
            if desconhecidos:
                raise ValueError(f"Segmentos desconhecidos: {', '.join(sorted(desconhecidos))}.")
            object.__setattr__(self, "segmentacao_declarada", segmentos)

    @property
    def pesos_copy_normalizados(self) -> tuple[float, ...]:
        soma = sum(self.angulos_copy)
        return tuple(peso / soma for peso in self.angulos_copy)
