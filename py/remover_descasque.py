#!/usr/bin/env python3
"""
Remove linhas HCP608 e HCP610 da tabela de descasque (db/skive.json)
Execute na raiz do projeto: python3 remover_descasque.py
Depois execute py/export_js.py para regenerar js/dados.js
"""
import json, shutil, os
from datetime import datetime

SKIVE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'db', 'skive.json')

if not os.path.exists(SKIVE_PATH):
    print(f"❌ Arquivo não encontrado: {SKIVE_PATH}")
    exit(1)

# Backup automático
backup = SKIVE_PATH + f'.bak_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
shutil.copy2(SKIVE_PATH, backup)
print(f"✅ Backup: {backup}")

with open(SKIVE_PATH, encoding='utf-8') as f:
    data = json.load(f)

print(f"Total antes: {len(data)} registros")

REMOVER = {'HCP608', 'HCP610'}

removidos = []
mantidos  = []
for r in data:
    # Verificar em todos os campos string do registro
    tem_alvo = any(
        str(v).upper().strip() in REMOVER
        for v in r.values()
        if isinstance(v, (str, int, float))
    )
    if tem_alvo:
        removidos.append(r)
    else:
        mantidos.append(r)

print(f"Removidos: {len(removidos)}")
for r in removidos:
    print(f"  {json.dumps(r, ensure_ascii=False)}")

print(f"Mantidos:  {len(mantidos)}")

with open(SKIVE_PATH, 'w', encoding='utf-8') as f:
    json.dump(mantidos, f, ensure_ascii=False, indent=2)

print(f"\n✅ skive.json atualizado: {len(mantidos)} registros")
print("\nPróximo passo: execute py/export_js.py para regenerar js/dados.js")
