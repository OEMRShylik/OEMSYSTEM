#!/usr/bin/env python3
"""
export_js.py — Exporta db/*.json → js/dados.js (para uso no frontend)
Uso: python py/export_js.py
"""
import json, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB   = os.path.join(BASE, 'db')
JS   = os.path.join(BASE, 'js')

def main():
    skive    = json.load(open(os.path.join(DB,'skive.json'),   encoding='utf-8'))
    fittings = json.load(open(os.path.join(DB,'fittings.json'),encoding='utf-8'))
    crimp    = json.load(open(os.path.join(DB,'crimp.json'),   encoding='utf-8'))

    dados_js = f"""// ══════════════════════════════════════════════════
//  dados.js — Gerado automaticamente por py/export_js.py
//  NÃO editar manualmente — edite os JSONs em db/ e rode export_js.py
// ══════════════════════════════════════════════════

const DESCASQUE = {json.dumps(skive,    ensure_ascii=False, indent=2)};

const TERMINAIS = {json.dumps(fittings, ensure_ascii=False, indent=2)};

const CRIMP     = {json.dumps(crimp,    ensure_ascii=False, indent=2)};
"""
    out = os.path.join(JS, 'dados.js')
    with open(out,'w',encoding='utf-8') as f:
        f.write(dados_js)
    print(f"✅ dados.js gerado: {os.path.getsize(out)//1024}KB")
    print(f"   DESCASQUE: {len(skive)} | TERMINAIS: {len(fittings)} | CRIMP: {len(crimp)}")

if __name__ == '__main__':
    main()
