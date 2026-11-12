"""Motor de simulação vetorizada de consumidores para marketing."""

from .audience import gerar_audiencia_sintetica
from .funnel import simular_campanha
from .models import Campanha, CondicoesPagamento, ContextoMacro, PersonaBase

__all__ = [
    "Campanha",
    "CondicoesPagamento",
    "ContextoMacro",
    "PersonaBase",
    "gerar_audiencia_sintetica",
    "simular_campanha",
]
