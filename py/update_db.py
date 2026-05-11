#!/usr/bin/env python3
"""
update_db.py — Atualiza banco de dados a partir do Excel SISTEMA_OEM.xlsx
Uso: python py/update_db.py caminho/para/SISTEMA_OEM.xlsx
"""
import sys, json, os
import pandas as pd

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB   = os.path.join(BASE, 'db')

def na(v):
    return None if pd.isna(v) else v

def run(xlsx_path):
    xl = pd.read_excel(xlsx_path, sheet_name=None)
    
    # skive.json
    skive = [{'capa': r['CAPA'], 'ext': na(r['DESC EXTERNO']), 'int': na(r['DESC INTERNO'])}
             for _, r in xl['DESCASQUE'].iterrows()]
    with open(os.path.join(DB,'skive.json'),'w',encoding='utf-8') as f:
        json.dump(skive, f, ensure_ascii=False, indent=2)
    print(f"✅ skive.json: {len(skive)} registros")

    # fittings.json
    fittings = [{'id': int(r['ID']), 'cod': str(r['CÓD. HYLIK']).strip(),
                 'medida': na(r['MEDIDA'])}
                for _, r in xl['TERMINAIS'].iterrows()]
    with open(os.path.join(DB,'fittings.json'),'w',encoding='utf-8') as f:
        json.dump(fittings, f, ensure_ascii=False, indent=2)
    print(f"✅ fittings.json: {len(fittings)} registros")

    # crimp.json
    crimp = [{'id': int(r['ID']), 'mangueira': str(r['MANGUEIRA']).strip(),
               'descricao': str(r['DESCRIÇÃO']).strip(), 'cod': str(r['CÓD. HYLIK']).strip(),
               'size': str(r['SIZE']).strip(), 'capa': str(r['CAPA']).strip(),
               'medida': na(r['MEDIDA']), 'tela': na(r['TELA']),
               'castanha': na(r['CASTANHA']), 'correcao': na(r['CORREÇÃO'])}
              for _, r in xl['CRIMPAGEM'].iterrows()]
    with open(os.path.join(DB,'crimp.json'),'w',encoding='utf-8') as f:
        json.dump(crimp, f, ensure_ascii=False, indent=2)
    print(f"✅ crimp.json: {len(crimp)} registros")

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else input("Caminho do Excel: ")
    run(path)
