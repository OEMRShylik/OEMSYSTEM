#!/usr/bin/env python3
"""
load_db.py — Carrega e valida os arquivos de banco de dados JSON
Uso: python py/load_db.py
"""
import json, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB   = os.path.join(BASE, 'db')

def load(nome):
    path = os.path.join(DB, nome + '.json')
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def main():
    skive    = load('skive')
    fittings = load('fittings')
    crimp    = load('crimp')
    print(f"skive.json:    {len(skive):>4} registros")
    print(f"fittings.json: {len(fittings):>4} registros")
    print(f"crimp.json:    {len(crimp):>4} registros")

if __name__ == '__main__':
    main()
