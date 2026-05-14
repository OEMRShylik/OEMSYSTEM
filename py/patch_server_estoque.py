#!/usr/bin/env python3
"""
PATCH para server.py — adicionar endpoint /salvar_estoque

Copie e cole este trecho dentro do seu server.py,
junto com os outros endpoints @app.route existentes.
"""

# ── Adicionar este import no topo (se não tiver) ──
# import json, os

# ── Adicionar esta rota junto com as outras ──

"""
@app.route('/salvar_estoque', methods=['POST'])
def salvar_estoque():
    try:
        dados = request.get_json()
        if not dados or 'registros' not in dados:
            return jsonify({'ok': False, 'erro': 'Dados inválidos'}), 400

        caminho = os.path.join(os.path.dirname(__file__), '..', 'db', 'estoque.json')
        caminho = os.path.normpath(caminho)

        # Lê meta existente para preservar
        try:
            with open(caminho, 'r', encoding='utf-8') as f:
                atual = json.load(f)
        except Exception:
            atual = {'_meta': {}, 'registros': []}

        atual['registros'] = dados['registros']

        with open(caminho, 'w', encoding='utf-8') as f:
            json.dump(atual, f, ensure_ascii=False, indent=2)

        return jsonify({'ok': True, 'total': len(dados['registros'])})
    except Exception as e:
        return jsonify({'ok': False, 'erro': str(e)}), 500
"""

# ── Instrução de uso ──
print("""
✅ Copie a rota acima para dentro do seu server.py.

A estrutura esperada é:
  db/
    estoque.json    ← criado/atualizado pelo endpoint
  py/
    server.py       ← adicionar a rota /salvar_estoque aqui

Sem este endpoint, o sistema funciona normalmente em memória,
mas os dados de estoque não persistem entre recarregamentos.
""")
