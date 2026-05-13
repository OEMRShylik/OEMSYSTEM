// ══════════════════════════════════════════════════
//  DASHBOARD — OEM RS  |  Dados: Relatórios_OEM.xlsx
// ══════════════════════════════════════════════════

// ── Indicadores mensais ──
const D2025_IND = [
  { mes:'Julho',    ano:2025, pedidos:29,  mang:2650, mang_dia:115.22, mang_hora:13.48, faturamento:127484.00  },
  { mes:'Agosto',   ano:2025, pedidos:28,  mang:3367, mang_dia:160.33, mang_hora:18.75, faturamento:109424.64  },
  { mes:'Setembro', ano:2025, pedidos:32,  mang:4060, mang_dia:184.55, mang_hora:21.58, faturamento:138929.41  },
  { mes:'Outubro',  ano:2025, pedidos:49,  mang:3817, mang_dia:165.96, mang_hora:19.41, faturamento:146184.31  },
  { mes:'Novembro', ano:2025, pedidos:60,  mang:4564, mang_dia:228.20, mang_hora:26.69, faturamento:307927.13  },
  { mes:'Dezembro', ano:2025, pedidos:28,  mang:2238, mang_dia:111.90, mang_hora:13.09, faturamento:188366.57  },
];
const D2026_IND = [
  { mes:'Janeiro',   ano:2026, pedidos:58, mang:5622, mang_dia:255.55, mang_hora:29.89, faturamento:324135.27 },
  { mes:'Fevereiro', ano:2026, pedidos:68, mang:4923, mang_dia:246.15, mang_hora:28.79, faturamento:301327.41 },
  { mes:'Março',     ano:2026, pedidos:87, mang:5436, mang_dia:247.09, mang_hora:28.90, faturamento:334112.92 },
  { mes:'Abril',     ano:2026, pedidos:59, mang:4717, mang_dia:214.41, mang_hora:25.08, faturamento:83322.31  },
];

// ── Clientes ──
const D2025_CLI = [
  {cliente:'ING',pedidos:31,faturamento:322567.20},{cliente:'GELGAS',pedidos:33,faturamento:138112.82},
  {cliente:'GTM',pedidos:27,faturamento:126964.86},{cliente:'PHD',pedidos:22,faturamento:116033.73},
  {cliente:'METARO',pedidos:31,faturamento:75963.43},{cliente:'BRITIM',pedidos:2,faturamento:56805.00},
  {cliente:'GAS FUTURO',pedidos:3,faturamento:28532.53},{cliente:'BOZZA',pedidos:1,faturamento:24400.50},
  {cliente:'RODOVALE',pedidos:6,faturamento:23995.36},{cliente:'WSA',pedidos:12,faturamento:15272.61},
  {cliente:'INDUSTRIAL BUSSE',pedidos:3,faturamento:14463.68},{cliente:'NICOLA MANUTENÇÃO',pedidos:1,faturamento:8369.90},
  {cliente:'KAFABI',pedidos:1,faturamento:7751.60},{cliente:'RTMAQ',pedidos:4,faturamento:6061.38},
  {cliente:'HYDROLUBZ',pedidos:1,faturamento:5606.94},{cliente:'SUL EQUIPAMENTOS',pedidos:1,faturamento:5343.30},
  {cliente:'MONDO',pedidos:3,faturamento:4690.60},{cliente:'VERSATIL',pedidos:6,faturamento:4468.88},
  {cliente:'JANUARIO',pedidos:1,faturamento:4343.39},{cliente:'TEKSUL',pedidos:1,faturamento:4000.00},
];
const D2026_CLI = [
  {cliente:'ING',pedidos:63,faturamento:472928.86},{cliente:'GELGAS',pedidos:38,faturamento:264172.77},
  {cliente:'RODOVALE',pedidos:26,faturamento:59914.47},{cliente:'ESTRADA',pedidos:9,faturamento:49453.78},
  {cliente:'METARO',pedidos:19,faturamento:42759.06},{cliente:'INDUSTRIAL BUSSE',pedidos:18,faturamento:35500.93},
  {cliente:'PHD',pedidos:8,faturamento:24811.37},{cliente:'PASTRE',pedidos:3,faturamento:13160.00},
  {cliente:'WSA',pedidos:13,faturamento:11483.44},{cliente:'GUERRA',pedidos:14,faturamento:8441.92},
  {cliente:'PIERINO GOTTI',pedidos:3,faturamento:8245.20},{cliente:'HIDRA MASTER',pedidos:2,faturamento:7705.78},
  {cliente:'AGROSS',pedidos:13,faturamento:6565.94},{cliente:'VERSATIL',pedidos:1,faturamento:5132.00},
  {cliente:'BUDNY',pedidos:7,faturamento:3202.53},{cliente:'MD ACESSORIOS',pedidos:3,faturamento:3278.98},
  {cliente:'RTMAQ',pedidos:4,faturamento:2648.60},{cliente:'JANUARIO',pedidos:1,faturamento:2440.48},
  {cliente:'MONDO',pedidos:1,faturamento:2035.60},{cliente:'MARCHER',pedidos:2,faturamento:1579.89},
];

// ── Pedidos detalhados (498 registros) ──
window.DASH_PEDIDOS = [{"pedido":"000005","cliente":"METARO","qtd":102,"fat":3096.12,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000015","cliente":"PHD","qtd":58,"fat":3659.95,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000024","cliente":"GELGAS","qtd":12,"fat":917.52,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000028","cliente":"METARO","qtd":65,"fat":2186.39,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000047","cliente":"CONVICTA","qtd":0,"fat":1534.0,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000040","cliente":"GAS FUTURO","qtd":0,"fat":9323.5,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000041","cliente":"GAS FUTURO","qtd":0,"fat":15732.75,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000066","cliente":"GELGAS","qtd":16,"fat":1031.04,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000073","cliente":"MAURO GOMES","qtd":10,"fat":1639.9,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000078","cliente":"GELGAS","qtd":49,"fat":3352.3,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000094","cliente":"GTM","qtd":160,"fat":3285.06,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000095","cliente":"GTM","qtd":250,"fat":5947.3,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000096","cliente":"GTM","qtd":315,"fat":8350.55,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000097","cliente":"GTM","qtd":255,"fat":6408.7,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000098","cliente":"GTM","qtd":190,"fat":3564.3,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000129","cliente":"WSA","qtd":9,"fat":595.67,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000137","cliente":"GILGAB","qtd":4,"fat":456.84,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000141","cliente":"PHD","qtd":110,"fat":6257.45,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000144","cliente":"ING","qtd":1,"fat":50.68,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000148","cliente":"METARO","qtd":153,"fat":4008.02,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000158","cliente":"TEKSUL","qtd":50,"fat":4000.0,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000161","cliente":"KAFABI","qtd":70,"fat":7751.6,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000163","cliente":"ROSTER","qtd":25,"fat":1359.54,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000170","cliente":"ING","qtd":300,"fat":10668.25,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000196","cliente":"GELGAS","qtd":32,"fat":1960.46,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000197","cliente":"GELGAS","qtd":8,"fat":489.34,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000204","cliente":"GELGAS","qtd":73,"fat":5088.82,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000216","cliente":"GELGAS","qtd":110,"fat":7448.81,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000219","cliente":"METARO","qtd":223,"fat":7319.14,"mes":"07","mes_nome":"Julho","ano":2025},{"pedido":"000099","cliente":"GTM","qtd":90,"fat":3075.7,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000100","cliente":"GTM","qtd":20,"fat":551.2,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000101","cliente":"GTM","qtd":140,"fat":3725.25,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000102","cliente":"GTM","qtd":220,"fat":3676.4,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000103","cliente":"GTM","qtd":125,"fat":3384.35,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000262","cliente":"GELGAS","qtd":22,"fat":1520.65,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000104","cliente":"GTM","qtd":50,"fat":1761.8,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000105","cliente":"GTM","qtd":230,"fat":5790.75,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000288","cliente":"ING","qtd":200,"fat":4534.39,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000289","cliente":"ING","qtd":500,"fat":16194.25,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000290","cliente":"PHD","qtd":252,"fat":5986.0,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000303","cliente":"GELGAS","qtd":106,"fat":9159.1,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000305","cliente":"METARO","qtd":130,"fat":3360.02,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000106","cliente":"GTM","qtd":380,"fat":11080.75,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000317","cliente":"GELGAS","qtd":36,"fat":2781.49,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000377","cliente":"GELGAS","qtd":26,"fat":1705.63,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000422","cliente":"METARO","qtd":5,"fat":107.1,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000445","cliente":"METARO","qtd":1,"fat":26.82,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000394","cliente":"GELGAS","qtd":184,"fat":7939.57,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000457","cliente":"METARO","qtd":110,"fat":3164.01,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000458","cliente":"GELGAS","qtd":66,"fat":4482.08,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000557","cliente":"METARO","qtd":53,"fat":1522.21,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000565","cliente":"WSA","qtd":9,"fat":371.83,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000566","cliente":"IBL","qtd":6,"fat":615.86,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000577","cliente":"RTMAQ","qtd":50,"fat":2444.21,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000582","cliente":"WSA","qtd":16,"fat":2176.02,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000107","cliente":"GTM","qtd":150,"fat":3160.65,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000108","cliente":"GTM","qtd":190,"fat":5126.55,"mes":"08","mes_nome":"Agosto","ano":2025},{"pedido":"000109","cliente":"GTM","qtd":150,"fat":3304.55,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000110","cliente":"GTM","qtd":180,"fat":4745.0,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000600","cliente":"MARCHER","qtd":6,"fat":121.53,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000111","cliente":"GTM","qtd":145,"fat":3658.0,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000112","cliente":"GTM","qtd":170,"fat":5699.25,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000639","cliente":"METARO","qtd":63,"fat":2468.59,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000113","cliente":"GTM","qtd":160,"fat":5662.65,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000674","cliente":"PHD","qtd":110,"fat":6257.45,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000114","cliente":"GTM","qtd":190,"fat":4690.45,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000692","cliente":"PHD","qtd":375,"fat":7397.95,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000693","cliente":"ING","qtd":300,"fat":9716.55,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000706","cliente":"BNK","qtd":35,"fat":2446.82,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000711","cliente":"METARO","qtd":57,"fat":1816.73,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000717","cliente":"MONDO","qtd":3,"fat":1991.25,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000739","cliente":"ING","qtd":360,"fat":11659.86,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000741","cliente":"ING","qtd":360,"fat":11659.86,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000786","cliente":"METARO","qtd":100,"fat":2946.0,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000787","cliente":"METARO","qtd":60,"fat":1831.0,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000808","cliente":"METARO","qtd":32,"fat":1341.12,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000589","cliente":"GAS FUTURO","qtd":24,"fat":3476.28,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000833","cliente":"MARCHER","qtd":66,"fat":1336.83,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000838","cliente":"WSA","qtd":21,"fat":2571.53,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000839","cliente":"WSA","qtd":21,"fat":2571.53,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000115","cliente":"GTM","qtd":195,"fat":5151.85,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000740","cliente":"ING","qtd":360,"fat":11659.86,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000866","cliente":"GELGAS","qtd":155,"fat":10213.05,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000900","cliente":"METARO","qtd":52,"fat":2179.32,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000910","cliente":"BUDNY","qtd":20,"fat":1084.0,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000116","cliente":"GTM","qtd":195,"fat":5095.6,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000922","cliente":"GELGAS","qtd":10,"fat":588.85,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000919","cliente":"RTMAQ","qtd":75,"fat":3350.0,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000937","cliente":"METARO","qtd":10,"fat":236.1,"mes":"09","mes_nome":"Setembro","ano":2025},{"pedido":"000117","cliente":"GTM","qtd":180,"fat":4812.25,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"000878","cliente":"MADAL PALFINGER","qtd":20,"fat":1623.8,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"000119","cliente":"GTM","qtd":290,"fat":7264.3,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"000964","cliente":"METARO","qtd":110,"fat":3339.77,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"000133","cliente":"BOZZA","qtd":450,"fat":24400.5,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"000974","cliente":"BRITIM","qtd":101,"fat":2305.0,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"000970","cliente":"METARO","qtd":3,"fat":186.54,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"000855","cliente":"APLIK","qtd":36,"fat":1222.77,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"000983","cliente":"BUDNY","qtd":18,"fat":491.89,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001001","cliente":"RTMAQ","qtd":4,"fat":118.37,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001015","cliente":"SUL EQUIPAMENTOS","qtd":60,"fat":5343.3,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001045","cliente":"RODOVALE","qtd":10,"fat":630.25,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"000120","cliente":"GTM","qtd":255,"fat":4363.55,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001095","cliente":"METARO","qtd":144,"fat":3649.72,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001100","cliente":"RTMAQ","qtd":5,"fat":148.8,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001111","cliente":"PERINI EQUIP","qtd":5,"fat":869.55,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001104","cliente":"BUDNY","qtd":9,"fat":255.0,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"000121","cliente":"GTM","qtd":210,"fat":3628.1,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001122","cliente":"GELGAS","qtd":156,"fat":16318.94,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001127","cliente":"GELGAS","qtd":58,"fat":3954.34,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001168","cliente":"METARO","qtd":121,"fat":5520.98,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001186","cliente":"GELGAS","qtd":32,"fat":1933.26,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001199","cliente":"PHD","qtd":100,"fat":2110.0,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001215","cliente":"PHD","qtd":80,"fat":1616.4,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001218","cliente":"NICOLA MANUTENÇÃO","qtd":86,"fat":8369.9,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001247","cliente":"WSA","qtd":8,"fat":315.91,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001253","cliente":"METARO","qtd":149,"fat":4343.39,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001278","cliente":"ING","qtd":120,"fat":5756.25,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001280","cliente":"ING","qtd":200,"fat":9924.95,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001303","cliente":"WSA","qtd":10,"fat":1012.48,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001259","cliente":"WSA","qtd":32,"fat":2624.67,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001311","cliente":"MONDO","qtd":1,"fat":663.75,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001367","cliente":"GELGAS","qtd":20,"fat":1231.01,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001372","cliente":"METARO","qtd":58,"fat":1431.72,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001383","cliente":"GELGAS","qtd":13,"fat":752.63,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001384","cliente":"ROSTER","qtd":15,"fat":649.13,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001404","cliente":"GELGAS","qtd":100,"fat":7587.15,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001422","cliente":"NOMA","qtd":1,"fat":43.54,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001459","cliente":"WSA","qtd":5,"fat":313.4,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001458","cliente":"PHD","qtd":3,"fat":525.19,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001444","cliente":"METARO","qtd":3,"fat":148.81,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001453","cliente":"GELGAS","qtd":1,"fat":39.66,"mes":"10","mes_nome":"Outubro","ano":2025},{"pedido":"001470","cliente":"ING","qtd":24,"fat":1639.02,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001473","cliente":"HYDROLUBZ","qtd":102,"fat":5606.94,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001479","cliente":"PIERINO GOTTI","qtd":6,"fat":997.5,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001484","cliente":"MONDO","qtd":3,"fat":2035.6,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001486","cliente":"IBL","qtd":2,"fat":200.32,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001492","cliente":"ING","qtd":144,"fat":13073.64,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001493","cliente":"ING","qtd":72,"fat":6536.82,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001494","cliente":"ING","qtd":72,"fat":6536.82,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001500","cliente":"INW","qtd":30,"fat":3616.53,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001514","cliente":"GELGAS","qtd":4,"fat":326.74,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001517","cliente":"ING","qtd":24,"fat":1622.88,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001521","cliente":"ING","qtd":54,"fat":6759.42,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001425","cliente":"PHD","qtd":80,"fat":5220.14,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001445","cliente":"RODOVALE","qtd":115,"fat":6951.05,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001455","cliente":"ROSTER","qtd":16,"fat":666.11,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001522","cliente":"PHD","qtd":36,"fat":9200.0,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001523","cliente":"PHD","qtd":36,"fat":9200.0,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001524","cliente":"PHD","qtd":36,"fat":9200.0,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001526","cliente":"PHD","qtd":40,"fat":2844.8,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001528","cliente":"WSA","qtd":8,"fat":254.74,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001529","cliente":"ING","qtd":54,"fat":7693.62,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001530","cliente":"ING","qtd":54,"fat":7693.62,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001539","cliente":"PHD","qtd":3,"fat":150.97,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001547","cliente":"GELGAS","qtd":2,"fat":174.04,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001553","cliente":"METARO","qtd":42,"fat":2221.2,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001572","cliente":"METARO","qtd":3,"fat":98.16,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001589","cliente":"GELGAS","qtd":2,"fat":77.44,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001605","cliente":"METARO","qtd":142,"fat":7103.78,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001569","cliente":"ING","qtd":24,"fat":3805.7,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001617","cliente":"WSA","qtd":2,"fat":229.54,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001620","cliente":"PHD","qtd":111,"fat":9391.61,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001624","cliente":"GELGAS","qtd":100,"fat":5910.78,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001663","cliente":"ING","qtd":200,"fat":8750.0,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001665","cliente":"ING","qtd":600,"fat":26250.0,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001666","cliente":"ING","qtd":600,"fat":26250.0,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001682","cliente":"GUERRA","qtd":4,"fat":167.08,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001695","cliente":"GELGAS","qtd":2,"fat":170.16,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001697","cliente":"ROSTER","qtd":1,"fat":38.02,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001712","cliente":"GELGAS","qtd":75,"fat":15028.63,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001756","cliente":"METARO","qtd":4,"fat":183.52,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001753","cliente":"GELGAS","qtd":4,"fat":268.72,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001621","cliente":"PHD","qtd":60,"fat":8134.54,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001525","cliente":"PHD","qtd":288,"fat":14720.0,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001785","cliente":"VERSATIL","qtd":3,"fat":87.25,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001786","cliente":"VERSATIL","qtd":8,"fat":902.32,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001789","cliente":"ING","qtd":72,"fat":6536.82,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001796","cliente":"SULPRESS","qtd":10,"fat":998.0,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001800","cliente":"GELGAS","qtd":2,"fat":441.37,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001803","cliente":"ROSTER","qtd":1,"fat":38.02,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001788","cliente":"ING","qtd":104,"fat":11176.4,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001790","cliente":"ING","qtd":72,"fat":6536.82,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001667","cliente":"ING","qtd":600,"fat":26250.0,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001809","cliente":"PHD","qtd":54,"fat":3659.72,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001831","cliente":"GELGAS","qtd":96,"fat":6521.29,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001847","cliente":"PHD","qtd":120,"fat":2579.0,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001845","cliente":"ESTRADA","qtd":11,"fat":1356.32,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001848","cliente":"METARO","qtd":6,"fat":238.5,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001866","cliente":"GUERRA","qtd":10,"fat":417.7,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001864","cliente":"VERSATIL","qtd":14,"fat":983.4,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001885","cliente":"PHD","qtd":100,"fat":2204.0,"mes":"11","mes_nome":"Novembro","ano":2025},{"pedido":"001890","cliente":"PHD","qtd":51,"fat":1513.07,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001891","cliente":"PHD","qtd":51,"fat":3026.14,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001519","cliente":"RODOVALE","qtd":10,"fat":2073.5,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001794","cliente":"ING","qtd":72,"fat":4526.22,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001791","cliente":"ING","qtd":144,"fat":13073.64,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001907","cliente":"VERSATIL","qtd":12,"fat":443.58,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001903","cliente":"METARO","qtd":17,"fat":458.68,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001921","cliente":"VERSATIL","qtd":2,"fat":72.15,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001927","cliente":"METARO","qtd":24,"fat":708.63,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001792","cliente":"ING","qtd":144,"fat":13073.64,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001902","cliente":"RODOVALE","qtd":10,"fat":566.31,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001956","cliente":"ING","qtd":72,"fat":6707.22,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001668","cliente":"ING","qtd":600,"fat":26250.0,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001991","cliente":"PHD","qtd":22,"fat":1179.35,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001974","cliente":"VERSATIL","qtd":40,"fat":1980.18,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"002000","cliente":"GELGAS","qtd":2,"fat":170.16,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"002013","cliente":"WSA","qtd":8,"fat":1282.81,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001904","cliente":"GELGAS","qtd":136,"fat":12699.21,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"002018","cliente":"RODOVALE","qtd":20,"fat":3496.0,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"002022","cliente":"WSA","qtd":17,"fat":952.48,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"002027","cliente":"BRITIM","qtd":100,"fat":54500.0,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001446","cliente":"RODOVALE","qtd":195,"fat":10278.25,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"002046","cliente":"GELGAS","qtd":84,"fat":5828.58,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"002081","cliente":"METARO","qtd":39,"fat":1392.65,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"002089","cliente":"METARO","qtd":223,"fat":7328.69,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"002133","cliente":"IBL","qtd":112,"fat":13647.5,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"002158","cliente":"NOMA","qtd":25,"fat":913.32,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"002174","cliente":"NOMA","qtd":6,"fat":224.61,"mes":"12","mes_nome":"Dezembro","ano":2025},{"pedido":"001669","cliente":"ING","qtd":600,"fat":26250.0,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002162","cliente":"INDUSTRIAL BUSSE","qtd":106,"fat":8646.19,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002188","cliente":"RODOVALE","qtd":60,"fat":1323.6,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002190","cliente":"GELGAS","qtd":200,"fat":14621.79,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"001670","cliente":"ING","qtd":600,"fat":26250.0,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"001728","cliente":"RODOVALE","qtd":180,"fat":4937.4,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002243","cliente":"WSA","qtd":16,"fat":1311.28,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002245","cliente":"INDUSTRIAL BUSSE","qtd":3,"fat":300.48,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002246","cliente":"ING","qtd":84,"fat":4984.68,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002256","cliente":"METARO","qtd":145,"fat":4147.34,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"001716","cliente":"RODOVALE","qtd":54,"fat":5672.25,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002284","cliente":"GELGAS","qtd":4,"fat":592.92,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002289","cliente":"ING","qtd":216,"fat":17599.86,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002286","cliente":"BUDNY","qtd":18,"fat":410.06,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002309","cliente":"METARO","qtd":1,"fat":98.46,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002310","cliente":"METARO","qtd":2,"fat":52.54,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002312","cliente":"METARO","qtd":100,"fat":3100.0,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002316","cliente":"GUERRA","qtd":10,"fat":390.1,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"001447","cliente":"RODOVALE","qtd":220,"fat":12209.4,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"001727","cliente":"RODOVALE","qtd":10,"fat":630.25,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002283","cliente":"RODOVALE","qtd":20,"fat":3496.0,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002323","cliente":"GELGAS","qtd":116,"fat":9241.26,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002402","cliente":"GELGAS","qtd":10,"fat":847.66,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002401","cliente":"WSA","qtd":2,"fat":547.75,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002406","cliente":"RODOVALE","qtd":1,"fat":18.2,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002413","cliente":"PHD","qtd":160,"fat":3304.4,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002420","cliente":"WSA","qtd":6,"fat":407.51,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002412","cliente":"PHD","qtd":66,"fat":3530.05,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002427","cliente":"ING","qtd":360,"fat":15750.0,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002414","cliente":"ING","qtd":72,"fat":6536.82,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002440","cliente":"ESTRADA","qtd":32,"fat":3754.52,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002446","cliente":"GELGAS","qtd":2,"fat":181.65,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002415","cliente":"GELGAS","qtd":226,"fat":18163.17,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002436","cliente":"GELGAS","qtd":8,"fat":954.2,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002470","cliente":"GELGAS","qtd":2,"fat":15750.0,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002497","cliente":"ING","qtd":48,"fat":313.2,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002499","cliente":"GELGAS","qtd":2,"fat":15750.0,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002491","cliente":"ING","qtd":160,"fat":6840.36,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002540","cliente":"ING","qtd":1,"fat":281.52,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002541","cliente":"GELGAS","qtd":75,"fat":8337.4,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002544","cliente":"RODOVALE","qtd":1,"fat":98.56,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002546","cliente":"METARO","qtd":146,"fat":6164.68,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002566","cliente":"GELGAS","qtd":8,"fat":48.85,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002569","cliente":"VERSATIL","qtd":54,"fat":5132.0,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002585","cliente":"ESTRADA","qtd":1,"fat":850.0,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002590","cliente":"GELGAS","qtd":360,"fat":5055.04,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002601","cliente":"METARO","qtd":39,"fat":19.84,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002429","cliente":"ING","qtd":360,"fat":29520.2,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002614","cliente":"ING","qtd":51,"fat":1209.29,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002621","cliente":"INDUSTRIAL BUSSE","qtd":10,"fat":4888.45,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002430","cliente":"ING","qtd":360,"fat":1088.5,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002649","cliente":"MD ACESSORIOS","qtd":2,"fat":25.98,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002664","cliente":"ESTRADA","qtd":55,"fat":6781.6,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002667","cliente":"METARO","qtd":4,"fat":183.52,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002689","cliente":"HIDRA MASTER","qtd":3,"fat":325.28,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002733","cliente":"INDUSTRIAL BUSSE","qtd":2,"fat":125.72,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002389","cliente":"INDUSTRIAL BUSSE","qtd":129,"fat":10892.34,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002613","cliente":"ING","qtd":39,"fat":4191.15,"mes":"01","mes_nome":"Janeiro","ano":2026},{"pedido":"002448","cliente":"ESTRADA","qtd":44,"fat":5425.28,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002616","cliente":"TRIEL","qtd":6,"fat":1042.64,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002421","cliente":"ING","qtd":360,"fat":15750.0,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002682","cliente":"ING","qtd":168,"fat":6814.62,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002721","cliente":"MARCHER","qtd":54,"fat":1093.77,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002702","cliente":"WSA","qtd":24,"fat":1849.13,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002720","cliente":"ING","qtd":4,"fat":270.48,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002747","cliente":"INDUSTRIAL BUSSE","qtd":10,"fat":1001.6,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002751","cliente":"GELGAS","qtd":302,"fat":26140.03,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002638","cliente":"ING","qtd":72,"fat":4526.22,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002641","cliente":"ING","qtd":72,"fat":6536.82,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002716","cliente":"METARO","qtd":21,"fat":566.44,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002790","cliente":"METARO","qtd":218,"fat":7016.9,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002794","cliente":"PHD","qtd":30,"fat":3707.07,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002637","cliente":"ING","qtd":74,"fat":9332.64,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002817","cliente":"HLEMMAN SP","qtd":100,"fat":100.0,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002820","cliente":"GELGAS","qtd":6,"fat":458.94,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002859","cliente":"GELGAS","qtd":32,"fat":2347.11,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002868","cliente":"MONDO","qtd":3,"fat":2035.6,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002830","cliente":"ING","qtd":72,"fat":4526.22,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002447","cliente":"ESTRADA","qtd":40,"fat":5425.28,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002897","cliente":"GUERRA","qtd":78,"fat":4168.16,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002909","cliente":"WSA","qtd":2,"fat":520.91,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002492","cliente":"ING","qtd":80,"fat":3175.1,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002893","cliente":"ING","qtd":72,"fat":6536.82,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002422","cliente":"ING","qtd":360,"fat":15750.0,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002493","cliente":"ING","qtd":160,"fat":8337.4,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002805","cliente":"RODOVALE","qtd":25,"fat":4370.0,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002932","cliente":"METARO","qtd":34,"fat":1236.3,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002921","cliente":"ESTRADA","qtd":110,"fat":13563.2,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002942","cliente":"INDUSTRIAL BUSSE","qtd":2,"fat":152.3,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002945","cliente":"JANUARIO","qtd":36,"fat":2440.48,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002969","cliente":"ING","qtd":72,"fat":6536.82,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002901","cliente":"RODOVALE","qtd":30,"fat":2163.3,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002980","cliente":"MD ACESSORIOS","qtd":100,"fat":1626.5,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002989","cliente":"GELGAS","qtd":118,"fat":11372.52,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002999","cliente":"ESTRADA","qtd":2,"fat":31.5,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003016","cliente":"GELGAS","qtd":155,"fat":11227.0,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002423","cliente":"ING","qtd":360,"fat":15750.0,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002953","cliente":"BUDNY","qtd":20,"fat":1323.4,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003017","cliente":"INDUSTRIAL BUSSE","qtd":5,"fat":355.55,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003018","cliente":"GUERRA","qtd":10,"fat":390.1,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002910","cliente":"GUERRA","qtd":16,"fat":640.72,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002424","cliente":"ING","qtd":360,"fat":15750.0,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003021","cliente":"ESTRADA","qtd":4,"fat":63.0,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003002","cliente":"RODOVALE","qtd":10,"fat":128.1,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002550","cliente":"RODOVALE","qtd":90,"fat":5096.79,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003034","cliente":"ING","qtd":72,"fat":4526.22,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003044","cliente":"ING","qtd":54,"fat":7693.62,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003036","cliente":"METARO","qtd":23,"fat":1029.27,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003089","cliente":"GELGAS","qtd":4,"fat":273.25,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003092","cliente":"GELGAS","qtd":2,"fat":111.78,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003083","cliente":"PHD","qtd":66,"fat":3538.05,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003105","cliente":"GELGAS","qtd":1,"fat":60.14,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003110","cliente":"HIDRA MASTER","qtd":50,"fat":7380.5,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003119","cliente":"GELGAS","qtd":139,"fat":11542.32,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003123","cliente":"GELGAS","qtd":351,"fat":18448.44,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003148","cliente":"GELGAS","qtd":48,"fat":1163.79,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003153","cliente":"GUERRA","qtd":1,"fat":76.89,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003143","cliente":"WSA","qtd":9,"fat":410.83,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003174","cliente":"PHD","qtd":12,"fat":1824.75,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003175","cliente":"TORTUGA","qtd":1,"fat":46.17,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003176","cliente":"WSA","qtd":23,"fat":1711.46,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003200","cliente":"GUERRA","qtd":29,"fat":2229.81,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003232","cliente":"GELGAS","qtd":1,"fat":60.14,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003235","cliente":"GELGAS","qtd":2,"fat":193.64,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003210","cliente":"KUHN DO BRASIL","qtd":8,"fat":226.16,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"003247","cliente":"WSA","qtd":4,"fat":107.42,"mes":"02","mes_nome":"Fevereiro","ano":2026},{"pedido":"002948","cliente":"INDUSTRIAL BUSSE","qtd":22,"fat":1897.62,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003197","cliente":"PHD","qtd":100,"fat":2157.0,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003189","cliente":"ING","qtd":144,"fat":13073.64,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003241","cliente":"BUDNY","qtd":5,"fat":316.1,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003254","cliente":"GELGAS","qtd":256,"fat":20882.13,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003266","cliente":"GELGAS","qtd":10,"fat":726.72,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"002425","cliente":"ING","qtd":360,"fat":15750.0,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003274","cliente":"BUDNY","qtd":3,"fat":119.03,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003295","cliente":"RODOVALE","qtd":10,"fat":2073.5,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003064","cliente":"ROSTER","qtd":9,"fat":477.71,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003321","cliente":"AGROSS","qtd":12,"fat":1906.64,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003339","cliente":"RODOVALE","qtd":23,"fat":1007.82,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003352","cliente":"PASTRE","qtd":100,"fat":3290.0,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003340","cliente":"ING","qtd":72,"fat":4526.22,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003315","cliente":"METARO","qtd":160,"fat":4520.9,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003190","cliente":"ING","qtd":72,"fat":6534.0,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003291","cliente":"ING","qtd":72,"fat":6536.82,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003243","cliente":"ING","qtd":27,"fat":3379.71,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003320","cliente":"WSA","qtd":26,"fat":2454.27,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003402","cliente":"METARO","qtd":12,"fat":511.92,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003376","cliente":"SUL TORQUE","qtd":7,"fat":480.89,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003342","cliente":"ING","qtd":80,"fat":3175.1,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003398","cliente":"BUDNY","qtd":1,"fat":140.95,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003244","cliente":"ING","qtd":80,"fat":5431.12,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003421","cliente":"GELGAS","qtd":15,"fat":1209.2,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003410","cliente":"GELGAS","qtd":11,"fat":1478.83,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003425","cliente":"PIERINO GOTTI","qtd":14,"fat":1968.59,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003386","cliente":"ING","qtd":18,"fat":2237.1,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003268","cliente":"GELGAS","qtd":246,"fat":16395.33,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003163","cliente":"GUERRA","qtd":5,"fat":195.05,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003377","cliente":"ING","qtd":27,"fat":3379.71,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003467","cliente":"INDUSTRIAL BUSSE","qtd":2,"fat":129.14,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003476","cliente":"WSA","qtd":1,"fat":75.61,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003289","cliente":"ING","qtd":72,"fat":6536.82,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003478","cliente":"PIERINO GOTTI","qtd":3,"fat":370.84,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003449","cliente":"METARO","qtd":91,"fat":2870.29,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003353","cliente":"RODOVALE","qtd":20,"fat":4397.4,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003514","cliente":"SCHEMAQ","qtd":12,"fat":1390.08,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"002426","cliente":"ING","qtd":360,"fat":15750.0,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003347","cliente":"ING","qtd":200,"fat":8337.4,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"002938","cliente":"INDUSTRIAL BUSSE","qtd":16,"fat":1413.42,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003503","cliente":"KUHN DO BRASIL","qtd":14,"fat":397.82,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003495","cliente":"KUHN DO BRASIL","qtd":16,"fat":455.04,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003509","cliente":"WSA","qtd":24,"fat":1849.13,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003304","cliente":"GUERRA","qtd":5,"fat":195.05,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003357","cliente":"ING","qtd":80,"fat":3175.1,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003209","cliente":"ESTRADA","qtd":100,"fat":13559.4,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003433","cliente":"PRESSURE","qtd":1,"fat":19.72,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003446","cliente":"TER BRASIL","qtd":4,"fat":269.55,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003534","cliente":"METARO","qtd":50,"fat":2095.5,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003288","cliente":"ING","qtd":72,"fat":6536.82,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003440","cliente":"BUDNY","qtd":15,"fat":676.45,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003556","cliente":"RTMAQ","qtd":26,"fat":999.92,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003549","cliente":"CAVEMAQ","qtd":4,"fat":275.93,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003532","cliente":"ING","qtd":72,"fat":4526.22,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003404","cliente":"RODOVALE","qtd":40,"fat":1366.6,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003337","cliente":"ING","qtd":520,"fat":24087.4,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003523","cliente":"KAMPAG","qtd":8,"fat":822.24,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003424","cliente":"PIERINO GOTTI","qtd":42,"fat":5905.77,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003558","cliente":"TEKSUL","qtd":6,"fat":1466.76,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003350","cliente":"ING","qtd":360,"fat":15750.0,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003567","cliente":"RTMAQ","qtd":39,"fat":1499.88,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003574","cliente":"RODOVALE","qtd":30,"fat":777.6,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003581","cliente":"MD ACESSORIOS","qtd":100,"fat":1626.5,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003597","cliente":"ING","qtd":72,"fat":6534.0,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003606","cliente":"GELGAS","qtd":224,"fat":17675.02,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003611","cliente":"INDUSTRIAL BUSSE","qtd":16,"fat":1002.56,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003598","cliente":"ING","qtd":144,"fat":11063.04,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003599","cliente":"ING","qtd":72,"fat":4526.22,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003661","cliente":"GELGAS","qtd":3,"fat":263.55,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003649","cliente":"GELGAS","qtd":99,"fat":8547.17,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003676","cliente":"GELGAS","qtd":1,"fat":87.85,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003682","cliente":"RTMAQ","qtd":3,"fat":89.28,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003701","cliente":"RODOVALE","qtd":5,"fat":91.0,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003702","cliente":"GELGAS","qtd":1,"fat":79.18,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003773","cliente":"ING","qtd":12,"fat":5366.46,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003777","cliente":"INDUSTRIAL BUSSE","qtd":2,"fat":203.42,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003782","cliente":"METARO","qtd":60,"fat":1792.3,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003786","cliente":"BUDNY","qtd":12,"fat":216.54,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003814","cliente":"ELITE TECH","qtd":75,"fat":8250.0,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003816","cliente":"WSA","qtd":3,"fat":238.14,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003822","cliente":"PASTRE","qtd":150,"fat":4935.0,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003827","cliente":"RTMAQ","qtd":2,"fat":59.52,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003828","cliente":"MENCI","qtd":3,"fat":148.87,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003835","cliente":"FABRIMAQ","qtd":2,"fat":697.18,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003863","cliente":"PERINI EQUIP","qtd":5,"fat":869.55,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003887","cliente":"PHD","qtd":66,"fat":3538.05,"mes":"03","mes_nome":"Março","ano":2026},{"pedido":"003346","cliente":"ING","qtd":160,"fat":8337.4,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003562","cliente":"AGROSS","qtd":3,"fat":460.18,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003643","cliente":"METARO","qtd":226,"fat":7352.86,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003720","cliente":"RODOVALE","qtd":30,"fat":2163.3,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003694","cliente":"GELGAS","qtd":312,"fat":23884.75,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003650","cliente":"AGROSS","qtd":3,"fat":525.22,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003806","cliente":"AGROSS","qtd":3,"fat":436.16,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003726","cliente":"GUERRA","qtd":4,"fat":156.04,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003335","cliente":"ING","qtd":360,"fat":15750.0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003785","cliente":"MARCHER","qtd":24,"fat":486.12,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003823","cliente":"PASTRE","qtd":150,"fat":4935.0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003559","cliente":"AGROSS","qtd":3,"fat":476.66,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003853","cliente":"RODOVALE","qtd":20,"fat":3496.0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003944","cliente":"INDUSTRIAL BUSSE","qtd":30,"fat":1941.26,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003932","cliente":"RODOVALE","qtd":20,"fat":4397.4,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003955","cliente":"INDUSTRIAL BUSSE","qtd":36,"fat":2550.88,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003974","cliente":"PHD","qtd":150,"fat":3212.0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003600","cliente":"AGROSS","qtd":18,"fat":2761.08,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003981","cliente":"GELGAS","qtd":258,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003990","cliente":"GELGAS","qtd":4,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003991","cliente":"AGROSS","qtd":9,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004009","cliente":"GUERRA","qtd":2,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004021","cliente":"HIAB","qtd":42,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004029","cliente":"AGROSS","qtd":4,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003332","cliente":"ING","qtd":360,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004012","cliente":"GUERRA","qtd":4,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004011","cliente":"GUERRA","qtd":4,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004053","cliente":"INDUSTRIAL BUSSE","qtd":30,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004059","cliente":"METARO","qtd":153,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003996","cliente":"ING","qtd":72,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004068","cliente":"BOMAG","qtd":1,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003725","cliente":"GUERRA","qtd":4,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003883","cliente":"FEZER","qtd":87,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003972","cliente":"RODOVALE","qtd":30,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003997","cliente":"ING","qtd":72,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004083","cliente":"AGROSS","qtd":22,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004090","cliente":"AGROSS","qtd":44,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004080","cliente":"FEZER","qtd":83,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004066","cliente":"RODOVALE","qtd":120,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003810","cliente":"AGROSS","qtd":15,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004081","cliente":"FEZER","qtd":87,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003934","cliente":"ING","qtd":160,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004141","cliente":"INDUSTRIAL BUSSE","qtd":36,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004162","cliente":"AGROSS","qtd":3,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003998","cliente":"ING","qtd":144,"fat":0,"mes":"04","mes_nome":"Abril","ao":2026},{"pedido":"003345","cliente":"ING","qtd":360,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004000","cliente":"ING","qtd":126,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003999","cliente":"ING","qtd":72,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004005","cliente":"ING","qtd":126,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004110","cliente":"RODOVALE","qtd":10,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004148","cliente":"RODOVALE","qtd":30,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004218","cliente":"WSA","qtd":4,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004220","cliente":"METARO","qtd":177,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003630","cliente":"AGROSS","qtd":13,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004251","cliente":"GUERRA","qtd":4,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004228","cliente":"INDUSTRIAL BUSSE","qtd":4,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004213","cliente":"RODOVALE","qtd":30,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"003933","cliente":"ING","qtd":272,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026},{"pedido":"004249","cliente":"FEZER","qtd":87,"fat":0,"mes":"04","mes_nome":"Abril","ano":2026}];

// ── State ──
window.DASH_ANO = 'all';
window.DASH_MES_SEL = null; // { mes:'04', ano:2026 }

// ── Meses disponíveis ordenados ──
const MESES_ORD = [
  {mes:'07',ano:2025,nome:'Julho/25'},{mes:'08',ano:2025,nome:'Agosto/25'},
  {mes:'09',ano:2025,nome:'Setembro/25'},{mes:'10',ano:2025,nome:'Outubro/25'},
  {mes:'11',ano:2025,nome:'Novembro/25'},{mes:'12',ano:2025,nome:'Dezembro/25'},
  {mes:'01',ano:2026,nome:'Janeiro/26'},{mes:'02',ano:2026,nome:'Fevereiro/26'},
  {mes:'03',ano:2026,nome:'Março/26'},{mes:'04',ano:2026,nome:'Abril/26'},
];

// ════════════════════════════════════════════════════
//  RENDER PRINCIPAL
// ════════════════════════════════════════════════════
function renderDashboard() {
  const root = document.getElementById('dash-root');
  if (!root) return;

  const allInd = [...D2025_IND, ...D2026_IND];
  const ano    = window.DASH_ANO;
  const indAT  = ano==='2025' ? D2025_IND : ano==='2026' ? D2026_IND : allInd;
  const cliAT  = ano==='2025' ? D2025_CLI : ano==='2026' ? D2026_CLI : _mergeClientes();

  const totFat  = indAT.reduce((s,d)=>s+d.faturamento,0);
  const totMang = indAT.reduce((s,d)=>s+d.mang,0);
  const totPed  = indAT.reduce((s,d)=>s+d.pedidos,0);
  const maxMang = Math.max(...allInd.map(d=>d.mang));
  const maxFat  = Math.max(...cliAT.map(c=>c.faturamento));

  const ultimo   = D2026_IND[D2026_IND.length-1];
  const anterior = D2026_IND[D2026_IND.length-2]||D2026_IND[0];

  // Ticket médio (faturamento / pedidos) do mês atual
  const ticketMedio = ultimo.pedidos > 0 ? ultimo.faturamento / ultimo.pedidos : 0;
  const ticketAnt   = anterior.pedidos > 0 ? anterior.faturamento / anterior.pedidos : 0;

  const fmtR  = v => 'R$\u00a0' + v.toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0});
  const fmtRc = v => 'R$\u00a0' + v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmt   = v => v>=1e6 ? (v/1e6).toFixed(2)+'M' : v>=1e3 ? (v/1e3).toFixed(0)+'k' : String(v);
  const dV    = v => v>0?'▲':v<0?'▼':'—';
  const dC    = v => v>0?'up':v<0?'dn':'';
  const dd    = (a,b,k) => { const v=a[k]-b[k]; return `<span class="dash-delta ${dC(v)}">${dV(v)}</span>`; };

  // Mês selecionado para tabela de pedidos
  const mesSel = window.DASH_MES_SEL || MESES_ORD[MESES_ORD.length-1];
  const pedsMes = window.DASH_PEDIDOS.filter(p => p.mes===mesSel.mes && p.ano===mesSel.ano)
                    .sort((a,b)=>b.qtd-a.qtd);
  const totQtdMes = pedsMes.reduce((s,p)=>s+p.qtd,0);
  const totFatMes = pedsMes.reduce((s,p)=>s+p.fat,0);

  root.innerHTML = `
  <div class="dash-wrap">

    <!-- HEADER -->
    <div class="dash-header">
      <div>
        <div class="dash-title">Dashboard de Produção</div>
        <div class="dash-subtitle">OEM RS · Jul/2025 – Abr/2026 · ${allInd.length} meses</div>
      </div>
      <div class="dash-year-tabs">
        <button class="dash-ytab ${ano==='all'?'active':''}"  onclick="dashFiltrar('all',this)">Geral</button>
        <button class="dash-ytab ${ano==='2026'?'active':''}" onclick="dashFiltrar('2026',this)">2026</button>
        <button class="dash-ytab ${ano==='2025'?'active':''}" onclick="dashFiltrar('2025',this)">2025</button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="dash-kpis">
      ${_kpi('📦','Pedidos',        totPed,                     `${indAT.length} meses acumulado`, '')}
      ${_kpi('🔧','Produção',       fmt(totMang)+' mang',       `${fmt(totMang/indAT.length)}/mês médio`, '')}
      ${_kpi('💰','Faturamento',    fmtR(totFat),               `${fmtR(totFat/indAT.length)}/mês médio`, '')}
      ${_kpi('⚡','Mang/hora',      ultimo.mang_hora.toFixed(2),`${anterior.mang_hora.toFixed(2)} mês ant. ${dd(ultimo,anterior,'mang_hora')}`, '')}
      ${_kpi('📋','Ticket Médio',   fmtR(ticketMedio),          `${fmtR(ticketAnt)} mês ant. <span class="dash-delta ${dC(ticketMedio-ticketAnt)}">${dV(ticketMedio-ticketAnt)}</span>`, ticketMedio>ticketAnt?'kpi-ok':'kpi-amber')}
      ${_kpi('🏆','Maior Cliente',  cliAT[0]?.cliente||'—',     `${fmtR(cliAT[0]?.faturamento||0)}`, '')}
      ${_kpi('📈','Mang/dia',       ultimo.mang_dia.toFixed(1), `${anterior.mang_dia.toFixed(1)} mês ant. ${dd(ultimo,anterior,'mang_dia')}`, '')}
      ${_kpi('🗓️','Último mês',     fmtR(ultimo.faturamento),   `${ultimo.mes} · ${ultimo.pedidos} pedidos`, '')}
    </div>

    <!-- BARRAS + CLIENTES -->
    <div class="dash-charts-row">

      <!-- Produção mensal -->
      <div class="dash-card">
        <div class="dash-card-title">
          Produção Mensal (mangueiras)
          <span style="margin-left:auto;display:flex;gap:10px;font-size:11px;font-weight:400;color:#6b7280">
            <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#cbd5e1;margin-right:3px;vertical-align:middle"></span>2025</span>
            <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#3b82f6;margin-right:3px;vertical-align:middle"></span>2026</span>
          </span>
        </div>
        <div class="dash-bar-chart">
          ${allInd.map((d,i)=>{
            const pct  = Math.round((d.mang/maxMang)*100);
            const lbl  = d.mes.slice(0,3)+'/'+String(d.ano).slice(2);
            const last = i===allInd.length-1;
            const dim  = ano!=='all' && d.ano!==parseInt(ano);
            return `<div class="dash-bar-col" title="${d.mes} ${d.ano}: ${d.mang.toLocaleString('pt-BR')} mang">
              <div class="dash-bar-val">${d.mang>=1000?(d.mang/1000).toFixed(1)+'k':d.mang}</div>
              <div class="dash-bar-track">
                <div class="dash-bar-fill ${last?'current':''} ${d.ano===2026?'y2026':'y2025'}" style="height:${pct}%;${dim?'opacity:0.2':''}"></div>
              </div>
              <div class="dash-bar-lbl ${last?'active':''}" style="${dim?'opacity:0.3':''}">${lbl}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Top clientes por pedidos -->
      <div class="dash-card dash-card-sm">
        <div class="dash-card-title">Top por Pedidos <span class="dash-badge">${ano==='all'?'Geral':ano}</span></div>
        <div style="display:flex;flex-direction:column;gap:7px;">
          ${[...cliAT].sort((a,b)=>b.pedidos-a.pedidos).slice(0,10).map((c,i)=>{
            const maxP=Math.max(...cliAT.map(x=>x.pedidos));
            const pct=Math.round((c.pedidos/maxP)*100);
            const cores=['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6'];
            return `<div style="display:flex;align-items:center;gap:7px;font-family:Inter,sans-serif;">
              <div style="font-size:11px;font-weight:800;color:#94a3b8;min-width:16px;">${'①②③④⑤⑥⑦⑧⑨⑩'[i]||i+1}</div>
              <div style="font-size:11px;font-weight:700;color:#374151;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.cliente}</div>
              <div style="font-size:10px;background:#eff6ff;color:#1d4ed8;padding:1px 7px;border-radius:8px;font-weight:700;">${c.pedidos}p</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- FATURAMENTO POR CLIENTE -->
    <div class="dash-card dash-card-full">
      <div class="dash-card-title">Faturamento por Cliente <span class="dash-badge">${ano==='all'?'Geral':ano}</span></div>
      <div style="display:flex;flex-direction:column;gap:7px;">
        ${cliAT.slice(0,14).map((c,i)=>{
          const pct=Math.round((c.faturamento/maxFat)*100);
          const cores=['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6','#a855f7','#6366f1','#f43f5e','#0ea5e9'];
          return `<div style="display:flex;align-items:center;gap:8px;font-family:Inter,sans-serif;">
            <div style="width:110px;font-size:11px;font-weight:700;color:#374151;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.cliente}</div>
            <div style="flex:1;height:20px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
              <div class="dash-fat-bar" style="height:100%;background:${cores[i%cores.length]};width:0%;border-radius:4px;opacity:0.82;" data-w="${pct}"></div>
            </div>
            <div style="font-size:11px;font-weight:700;color:#111;min-width:90px;text-align:right;">${fmtR(c.faturamento)}</div>
            <div style="font-size:10px;color:#9ca3af;min-width:24px;text-align:right;">${c.pedidos}p</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- TABELA MENSAL -->
    <div class="dash-card dash-card-full">
      <div class="dash-card-title">Indicadores Mensais</div>
      <div class="dash-table-wrap">
        <table class="dash-table" id="dash-tabela">
          <thead>
            <tr><th>Mês</th><th>Pedidos</th><th>Produção</th><th>Mang/dia</th><th>Mang/hora</th><th>Faturamento</th><th>Ticket Médio</th></tr>
          </thead>
          <tbody>
            ${allInd.map((d,i)=>{
              const last=i===allInd.length-1;
              const dim=ano!=='all'&&d.ano!==parseInt(ano);
              const tick=d.pedidos>0?fmtR(d.faturamento/d.pedidos):'—';
              return `<tr class="${last?'dash-tr-highlight':''} tr-${d.ano}" style="${dim?'opacity:0.35':''}">
                <td><strong>${d.mes}</strong> <span class="dash-yr-badge">${d.ano}</span></td>
                <td>${d.pedidos}</td>
                <td><strong>${d.mang.toLocaleString('pt-BR')}</strong></td>
                <td>${d.mang_dia.toFixed(1)}</td>
                <td>${d.mang_hora.toFixed(2)}</td>
                <td><strong>${fmtR(d.faturamento)}</strong></td>
                <td>${tick}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr class="dash-tfoot">
              <td><strong>TOTAL/MÉD.</strong></td>
              <td>${allInd.reduce((s,d)=>s+d.pedidos,0)}</td>
              <td><strong>${allInd.reduce((s,d)=>s+d.mang,0).toLocaleString('pt-BR')}</strong></td>
              <td>${(allInd.reduce((s,d)=>s+d.mang_dia,0)/allInd.length).toFixed(1)}</td>
              <td>${(allInd.reduce((s,d)=>s+d.mang_hora,0)/allInd.length).toFixed(2)}</td>
              <td><strong>${fmtR(allInd.reduce((s,d)=>s+d.faturamento,0))}</strong></td>
              <td>${fmtR(allInd.reduce((s,d)=>s+d.faturamento,0)/allInd.reduce((s,d)=>s+d.pedidos,0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- QUADRO DE PEDIDOS POR MÊS -->
    <div class="dash-card dash-card-full" id="dash-pedidos-card">
      <div class="dash-card-title" style="flex-wrap:wrap;gap:10px;">
        <span>Pedidos do Mês</span>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-left:auto;">
          ${MESES_ORD.map(m=>`
            <button class="dash-mes-btn ${m.mes===mesSel.mes&&m.ano===mesSel.ano?'active':''}"
              onclick="dashSelMes('${m.mes}',${m.ano})">
              ${m.nome}
            </button>`).join('')}
        </div>
      </div>

      <!-- Resumo do mês -->
      <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
        <div class="dash-mes-stat">
          <div class="dash-mes-stat-val">${pedsMes.length}</div>
          <div class="dash-mes-stat-lbl">Pedidos</div>
        </div>
        <div class="dash-mes-stat">
          <div class="dash-mes-stat-val">${totQtdMes.toLocaleString('pt-BR')}</div>
          <div class="dash-mes-stat-lbl">Mangueiras</div>
        </div>
        <div class="dash-mes-stat">
          <div class="dash-mes-stat-val">${fmtR(totFatMes)}</div>
          <div class="dash-mes-stat-lbl">Faturamento</div>
        </div>
        <div class="dash-mes-stat" style="margin-left:auto;">
          <input class="dash-search-ped" id="dash-search-ped" type="text" placeholder="🔍 Buscar pedido ou cliente..."
            oninput="dashFiltrarPedidos(this.value)" style="padding:6px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;outline:none;width:240px;">
        </div>
      </div>

      <!-- Tabela de pedidos -->
      <div class="dash-table-wrap">
        <table class="dash-table" id="dash-ped-table">
          <thead>
            <tr>
              <th style="width:110px">Pedido</th>
              <th>Cliente</th>
              <th style="text-align:right">Qtd. Mangueiras</th>
              <th style="text-align:right">Faturamento</th>
            </tr>
          </thead>
          <tbody id="dash-ped-tbody">
            ${_renderPedidosRows(pedsMes, fmtRc)}
          </tbody>
        </table>
      </div>
    </div>

  </div>`;

  // Anima barras de produção
  requestAnimationFrame(() => {
    document.querySelectorAll('.dash-bar-fill').forEach((el,i) => {
      const h=el.style.height; el.style.height='0';
      el.style.transition=`height .55s cubic-bezier(.34,1.56,.64,1) ${i*.04}s`;
      requestAnimationFrame(()=>{ el.style.height=h; });
    });
    // Anima barras de faturamento
    document.querySelectorAll('.dash-fat-bar').forEach((el,i) => {
      const w=el.dataset.w+'%'; el.style.width='0';
      el.style.transition=`width .6s ease ${i*.05}s`;
      requestAnimationFrame(()=>{ el.style.width=w; });
    });
  });
}

function _renderPedidosRows(peds, fmtRc) {
  if (!peds.length) return `<tr><td colspan="4" style="text-align:center;padding:24px;color:#9ca3af;font-family:Inter,sans-serif;">Nenhum pedido encontrado</td></tr>`;
  return peds.map((p,i) => {
    const fatStr = p.fat > 0 ? fmtRc(p.fat) : '<span style="color:#9ca3af">—</span>';
    const qtdColor = p.qtd >= 300 ? '#7c3aed' : p.qtd >= 100 ? '#1d4ed8' : '#374151';
    return `<tr class="dash-ped-row" onclick="dashAbrirPedido('${p.pedido}')" title="Clique para abrir pedido #${p.pedido}">
      <td><span class="dash-ped-num">#${p.pedido}</span></td>
      <td><strong>${p.cliente}</strong></td>
      <td style="text-align:right;font-family:'JetBrains Mono',monospace;font-weight:700;color:${qtdColor};">${p.qtd > 0 ? p.qtd.toLocaleString('pt-BR') : '<span style="color:#d1d5db">—</span>'}</td>
      <td style="text-align:right;">${fatStr}</td>
    </tr>`;
  }).join('');
}

// ── Filtrar pedidos na busca ──
function dashFiltrarPedidos(q) {
  const mesSel = window.DASH_MES_SEL || MESES_ORD[MESES_ORD.length-1];
  const fmtRc  = v => 'R$\u00a0' + v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  let peds = window.DASH_PEDIDOS.filter(p => p.mes===mesSel.mes && p.ano===mesSel.ano).sort((a,b)=>b.qtd-a.qtd);
  if (q.trim()) {
    const qq = q.toLowerCase();
    peds = peds.filter(p => p.pedido.toLowerCase().includes(qq) || p.cliente.toLowerCase().includes(qq));
  }
  const tbody = document.getElementById('dash-ped-tbody');
  if (tbody) tbody.innerHTML = _renderPedidosRows(peds, fmtRc);
}

// ── Selecionar mês na tabela de pedidos ──
function dashSelMes(mes, ano) {
  window.DASH_MES_SEL = { mes, ano };
  // Limpa busca
  const searchEl = document.getElementById('dash-search-ped');
  if (searchEl) searchEl.value = '';
  renderDashboard();
  // Scroll suave até o quadro
  setTimeout(() => {
    const card = document.getElementById('dash-pedidos-card');
    if (card) card.scrollIntoView({ behavior:'smooth', block:'start' });
  }, 80);
}

// ── Abrir pedido no sistema de gestão ──
function dashAbrirPedido(numPedido) {
  // Busca na lista de pedidos do sistema (kanban)
  if (typeof pedidos !== 'undefined' && pedidos.length > 0) {
    const idx = pedidos.findIndex(p => p.id === numPedido || p.id === numPedido.replace(/^0+/,''));
    if (idx >= 0) {
      // Navega para detalhe como o kanban faz
      if (typeof abrirPedido === 'function') {
        abrirPedido(idx);
        return;
      }
    }
  }
  // Se não encontrou no kanban, mostra modal com dados da planilha
  const p = window.DASH_PEDIDOS.find(x => x.pedido === numPedido);
  if (!p) return;
  const fmtR = v => 'R$\u00a0'+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  _dashModalPedido(p, fmtR);
}

function _dashModalPedido(p, fmtR) {
  let m = document.getElementById('dash-ped-modal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'dash-ped-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
    document.body.appendChild(m);
  }
  m.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:340px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.22);animation:upcIn .18s ease;">
      <div style="background:linear-gradient(135deg,#1a56db,#0e3fa8);padding:24px 20px 20px;position:relative;">
        <button onclick="document.getElementById('dash-ped-modal').remove()" style="position:absolute;top:12px;right:14px;background:rgba(255,255,255,.15);border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.7);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Pedido</div>
        <div style="font-size:24px;font-weight:900;color:#fff;font-family:'Roboto',sans-serif;">#${p.pedido}</div>
        <div style="font-size:14px;font-weight:700;color:rgba(255,255,255,.9);margin-top:4px;">${p.cliente}</div>
      </div>
      <div style="padding:20px;">
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;font-family:Inter,sans-serif;">
          <span style="font-size:13px;color:#6b7280;">Mangueiras</span>
          <span style="font-size:13px;font-weight:700;color:#1a56db;">${p.qtd > 0 ? p.qtd.toLocaleString('pt-BR') + ' un.' : '—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;font-family:Inter,sans-serif;">
          <span style="font-size:13px;color:#6b7280;">Faturamento</span>
          <span style="font-size:13px;font-weight:700;">${p.fat > 0 ? fmtR(p.fat) : '—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;font-family:Inter,sans-serif;">
          <span style="font-size:13px;color:#6b7280;">Período</span>
          <span style="font-size:13px;font-weight:700;">${p.mes_nome} ${p.ano}</span>
        </div>
        <div style="margin-top:4px;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;font-family:Inter,sans-serif;">
          ℹ️ Pedido não encontrado em Gestão de Pedidos. Dados da planilha.
        </div>
      </div>
    </div>`;
  m.onclick = e => { if(e.target===m) m.remove(); };
}

// ── Helpers ──
function _mergeClientes() {
  const map={};
  [...D2025_CLI,...D2026_CLI].forEach(c=>{
    if(!map[c.cliente]) map[c.cliente]={cliente:c.cliente,pedidos:0,faturamento:0};
    map[c.cliente].pedidos+=c.pedidos;
    map[c.cliente].faturamento+=c.faturamento;
  });
  return Object.values(map).sort((a,b)=>b.faturamento-a.faturamento);
}

function _kpi(icon,label,val,sub,cls){
  return `<div class="dash-kpi ${cls}">
    <div class="dash-kpi-icon">${icon}</div>
    <div class="dash-kpi-body">
      <div class="dash-kpi-label">${label}</div>
      <div class="dash-kpi-val">${val}</div>
      <div class="dash-kpi-sub">${sub}</div>
    </div>
  </div>`;
}

function _donutSVG(rtAcum,rtTotal,rtColor){
  const entries=Object.entries(rtAcum).sort((a,b)=>b[1]-a[1]);
  const cx=50,cy=50,r=38,inner=24;
  let angle=-90,paths='';
  entries.forEach(([k,v])=>{
    const sweep=(v/rtTotal)*360;
    const a1=angle*Math.PI/180,a2=(angle+sweep)*Math.PI/180;
    const x1o=cx+r*Math.cos(a1),y1o=cy+r*Math.sin(a1);
    const x2o=cx+r*Math.cos(a2),y2o=cy+r*Math.sin(a2);
    const x1i=cx+inner*Math.cos(a2),y1i=cy+inner*Math.sin(a2);
    const x2i=cx+inner*Math.cos(a1),y2i=cy+inner*Math.sin(a1);
    const lg=sweep>180?1:0;
    paths+=`<path d="M${x1o.toFixed(2)},${y1o.toFixed(2)} A${r},${r} 0 ${lg},1 ${x2o.toFixed(2)},${y2o.toFixed(2)} L${x1i.toFixed(2)},${y1i.toFixed(2)} A${inner},${inner} 0 ${lg},0 ${x2i.toFixed(2)},${y2i.toFixed(2)} Z" fill="${rtColor(k)}" opacity="0.88"/>`;
    angle+=sweep;
  });
  return paths;
}

function dashFiltrar(ano,btn){
  window.DASH_ANO=ano;
  renderDashboard();
}
