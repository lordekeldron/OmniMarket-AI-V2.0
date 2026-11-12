# Motor de simulação de consumidores

Pacote Python modular para comparar campanhas sobre uma audiência sintética vetorizada, sem agentes conversacionais individuais e sem dados pessoais reais.

## Arquitetura

- `consumer_simulation/models.py`: modelos imutáveis e validação de persona, cenário macro, campanha e pagamento.
- `consumer_simulation/audience.py`: geração NumPy da distribuição 70/20/10, variáveis psicográficas e ajuste macroeconômico; retorna um `pandas.DataFrame`.
- `consumer_simulation/funnel.py`: exposição, atenção, aderência à copy, confiança, capacidade de pagamento e status final em operações de lote.
- `consumer_simulation/telemetry.py`: métricas agregadas em dicionários serializáveis, incluindo desempenho por coorte.
- `consumer_simulation/example.py`: comparação reproduzível entre desconto à vista e preço parcelado.
- `tests/`: invariantes de proporção, macro, segmentação, repetibilidade e campanhas sem mídia.

## Instalação e execução

Na pasta `simulation_engine`:

```bash
python -m pip install -e '.[test]'
python -m consumer_simulation.example --amostra 50000
python -m pytest
```

A amostra pode ser ajustada para testes rápidos, por exemplo `--amostra 5000`, ou validações maiores, como `--amostra 100000`.

## API principal

```python
from consumer_simulation import (
    Campanha,
    CondicoesPagamento,
    ContextoMacro,
    PersonaBase,
    gerar_audiencia_sintetica,
    simular_campanha,
)

audiencia = gerar_audiencia_sintetica(persona, 50_000, macro, seed=2026)
resultado = simular_campanha(audiencia, campanha, seed=77)
telemetria = resultado["telemetria"]
status_individual = resultado["individuos"]
```

A telemetria é JSON-serializável. `individuos` é um DataFrame enxuto com status por perfil; use `incluir_individuos=False` quando só precisar dos agregados. `angulos_copy` segue a ordem `preco_desconto`, `status`, `prova_social`, `urgencia_escassez`, `autoridade`; os pesos são normalizados internamente. `segmentacao_declarada` aceita `nucleo`, `adjacente` e `anti_persona`, ou `None` para toda a amostra.

## Premissas e calibração

- A divisão 70/20/10 usa o método dos maiores restos; contagens inteiras somam exatamente o tamanho solicitado.
- CPM padrão é uma hipótese configurável, não um benchmark universal. O orçamento gera impressões estimadas e uma probabilidade saturável de alcance.
- Renda disponível é aproximada por `renda_mensal × 0,28 × (1 − endividamento) × fator_macro`; a compra adiciona choques aleatórios para representar incerteza.
- Atenção, confiança e intenção de compra são filtros probabilísticos separados. O status de desconfiança também agrega baixo encaixe/intenção, mantendo os quatro estados solicitados. `curiosos_sem_compra` conta perfis atentos com curiosidade ≥ 0,65 que não converteram; é um proxy explícito, não uma observação de clique real.
- Inflação e juros reduzem orçamento disponível e elevam sensibilidade a preço; o índice de poder de compra ajusta essa pressão. As taxas macro são decimais anuais.
- `ROAS` usa receita bruta simulada dividida pelo orçamento de mídia; não representa lucro, margem, impostos ou custos de operação. `CAC` usa apenas o gasto de mídia.
- Os parâmetros probabilísticos são hipóteses iniciais para sandbox. Antes de orientar investimento real, devem ser calibrados e validados contra campanhas observadas, incluindo incerteza e viés de seleção.

Use a mesma semente para comparar alternativas com menor ruído aleatório. Os resultados são cenários simulados, não estimativas causais nem garantia de desempenho futuro.
