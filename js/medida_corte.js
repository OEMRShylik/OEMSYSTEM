// ══════════════════════════════════════════════════
//  MEDIDA DE CORTE — autocomplete campo único
//  Fórmula: Comprimento Final - Terminal A - Terminal B - 10
// ══════════════════════════════════════════════════

const TERMINAIS = [
  { cod: "HFJ0403", medida: 25 },{ cod: "HFJ0404", medida: 24 },{ cod: "HFJ0405", medida: null },
  { cod: "HFJ0406", medida: 24 },{ cod: "HFJ0504", medida: 26 },{ cod: "HFJ0505", medida: null },
  { cod: "HFJ0506", medida: 26 },{ cod: "HFJ0604", medida: 28 },{ cod: "HFJ0605", medida: 26.5 },
  { cod: "HFJ0606", medida: 27 },{ cod: "HFJ0606SS", medida: 25 },{ cod: "HFJ0606SD", medida: 32 },
  { cod: "HFJ0608", medida: 26.5 },{ cod: "HFJ0706", medida: 30 },{ cod: "HFJ0804", medida: 29 },
  { cod: "HFJ0805", medida: 29 },{ cod: "HFJ0806", medida: 30 },{ cod: "HFJ0806PS", medida: 30 },
  { cod: "HFJ0808", medida: 29 },{ cod: "HFJ0808SD", medida: 37 },{ cod: "HFJ0810", medida: 30.5 },
  { cod: "HFJ0812", medida: 30.5 },{ cod: "HFJ1006", medida: 30.5 },{ cod: "HFJ1008", medida: 33 },
  { cod: "HFJ1008PS", medida: 20 },{ cod: "HFJ1010", medida: 32 },{ cod: "HFJ1010SD", medida: 38 },
  { cod: "HFJ1012", medida: 35 },{ cod: "HFJ1208", medida: 30 },{ cod: "HFJ1210", medida: 35 },
  { cod: "HFJ1210PS", medida: 24 },{ cod: "HFJ1212", medida: 35 },{ cod: "HFJ1212SD", medida: 43 },
  { cod: "HFJ1212PS", medida: 24 },{ cod: "HFJ1216", medida: 36 },{ cod: "HFJ1610", medida: 40 },
  { cod: "HFJ1612", medida: 40 },{ cod: "HFJ1616", medida: 40 },{ cod: "HFJ1620", medida: 43 },
  { cod: "HFJ2016", medida: null },{ cod: "HFJ2020", medida: 50 },{ cod: "HFJ2420", medida: 45 },
  { cod: "HFJ2424PS", medida: 51 },{ cod: "HFJ2424", medida: 45 },{ cod: "HFJ3224", medida: null },
  { cod: "HFJ3232", medida: 36 },{ cod: "HFMJ3012", medida: 50 },{ cod: "HFJ900403", medida: 25 },
  { cod: "HFJ900404", medida: 33 },{ cod: "HFJ900405", medida: null },{ cod: "HFJ900406", medida: null },
  { cod: "HFJ900504", medida: 30 },{ cod: "HFJ900505", medida: null },{ cod: "HFJ900506", medida: 44.8 },
  { cod: "HFJ900604", medida: 30 },{ cod: "HFJ900604PS", medida: 30 },{ cod: "HFJ900605", medida: 43.5 },
  { cod: "HFJ900606", medida: 35 },{ cod: "HFJ900606SS", medida: 34 },{ cod: "HFJ900608", medida: 46.3 },
  { cod: "HFJ900806", medida: 38 },{ cod: "HFJ900806PS", medida: 38 },{ cod: "HFJ900808", medida: 40 },
  { cod: "HFJ900810", medida: 50 },{ cod: "HFJ901006", medida: 40 },{ cod: "HFJ901008", medida: 42 },
  { cod: "HFJ901012H50", medida: 54 },{ cod: "HFJ901010H50", medida: 50 },{ cod: "HFJ901010", medida: 56 },
  { cod: "HFJ901012", medida: 60 },{ cod: "HFJ901208", medida: 50 },{ cod: "HFJ901210", medida: 48 },
  { cod: "HFJ901210PS", medida: 55 },{ cod: "HFJ901212", medida: 48 },{ cod: "HFJ901212PS", medida: 65 },
  { cod: "HFJ901212H50", medida: 69 },{ cod: "HFJ901216", medida: 60 },{ cod: "HFJ901612", medida: 55 },
  { cod: "HFJ901616", medida: 74 },{ cod: "HFJ901620", medida: null },{ cod: "HFJ902016", medida: null },
  { cod: "HFJ902020", medida: 86 },{ cod: "HFJ902420", medida: null },{ cod: "HFJ902424", medida: 89 },
  { cod: "HFJ903232", medida: 130 },{ cod: "HFJ90L0604", medida: 32 },{ cod: "HFJ90L0606", medida: 39 },
  { cod: "HFJ90L0806", medida: 40 },{ cod: "HFJ90L0808", medida: 34 },{ cod: "HFJ90L1008", medida: 54 },
  { cod: "HFJ90L1210", medida: 56 },{ cod: "HFJ90L1212", medida: 60 },{ cod: "HFJ90L3232", medida: 143 },
  { cod: "HFJ450403", medida: 40 },{ cod: "HFJ450406", medida: 50 },{ cod: "HFJ450504", medida: 50 },
  { cod: "HFJ450604", medida: 57 },{ cod: "HFJ450806", medida: 60 },{ cod: "HFJ450806PSM", medida: 60 },
  { cod: "HFJ450808", medida: 65 },{ cod: "HFJ451008", medida: 72 },{ cod: "HFJ451010", medida: 75 },
  { cod: "HFJ451012", medida: 88.7 },{ cod: "HFJ451212", medida: 80 },{ cod: "HFJ451612", medida: 80 },
  { cod: "HFJ451616", medida: 93 },{ cod: "HMJ0504", medida: 40 },{ cod: "HMJ0604", medida: 40 },
  { cod: "HMJ0605", medida: 40 },{ cod: "HMJ0606", medida: 40 },{ cod: "HMJ0806", medida: 49 },
  { cod: "HMJ0808", medida: 49 },{ cod: "HMJ1006", medida: 53 },{ cod: "HMJ1008", medida: 35 },
  { cod: "HMJ1010", medida: 54 },{ cod: "HMJ1210", medida: 61 },{ cod: "HMJ1612", medida: 46 },
  { cod: "HFB0204", medida: 23 },{ cod: "HFB0404", medida: 24 },{ cod: "HFB0404SD", medida: 30 },
  { cod: "HFB0406", medida: 24 },{ cod: "HFB0604", medida: 27 },{ cod: "HFB0606", medida: 27 },
  { cod: "HFBP0606", medida: 25 },{ cod: "HFB0608", medida: 29 },{ cod: "HFB0806", medida: 26 },
  { cod: "HFB0808", medida: 30 },{ cod: "HFB0808SD", medida: 37 },{ cod: "HFB1008", medida: 33 },
  { cod: "HFB1010", medida: 34 },{ cod: "HFB1210", medida: 35 },{ cod: "HFB1212", medida: 35 },
  { cod: "HFB1616", medida: 41 },{ cod: "HFB900404", medida: 30 },{ cod: "HFB90C0404", medida: 23 },
  { cod: "HFB900604", medida: 68 },{ cod: "HFB900606", medida: 35 },{ cod: "HFB900806", medida: 38 },
  { cod: "HFB900808", medida: 45 },{ cod: "HFB901008", medida: 93 },{ cod: "HFB90C1010", medida: 34 },
  { cod: "HFB901212", medida: 55 },{ cod: "HFB901612", medida: 65 },{ cod: "HFB901616", medida: 65 },
  { cod: "HFB450404", medida: 48 },{ cod: "HFB450604", medida: 43 },{ cod: "HFB450606", medida: 53 },
  { cod: "HFB450808", medida: 69 },{ cod: "HFB451008", medida: 71 },{ cod: "HFBJ0404", medida: 10 },
  { cod: "HFBJ0604", medida: 32 },{ cod: "HFBJ0606", medida: 32 },{ cod: "HFBJ0806", medida: 40 },
  { cod: "HFBJ0808", medida: 40 },{ cod: "HMB0606", medida: 29 },{ cod: "HMB1210", medida: 37 },
  { cod: "HMB1212", medida: 38 },{ cod: "HMB1616", medida: 41 },{ cod: "HMB2424", medida: 45 },
  { cod: "HFMB1606", medida: 35 },{ cod: "HMN0204", medida: 25 },{ cod: "HMN0404", medida: 28 },
  { cod: "HMNG0404", medida: 30 },{ cod: "HMN0406", medida: 28 },{ cod: "HMN0604", medida: 30 },
  { cod: "HMN0606", medida: 30 },{ cod: "HMN0608", medida: 30 },{ cod: "HMN0804", medida: 39 },
  { cod: "HMN0806", medida: 36 },{ cod: "HMN0808", medida: 33 },{ cod: "HMN0810", medida: 37 },
  { cod: "HMN0812", medida: 38 },{ cod: "HMN1210", medida: 40 },{ cod: "HMN1212", medida: 41 },
  { cod: "HMN1216", medida: 41 },{ cod: "HMN1612", medida: 45 },{ cod: "HLMN1612", medida: 65 },
  { cod: "HMN1616", medida: 40 },{ cod: "HLMN1616", medida: 65 },{ cod: "HMN0203", medida: 26 },
  { cod: "HMN2016", medida: 50 },{ cod: "HMN2020", medida: 50 },{ cod: "HMN2420", medida: 56 },
  { cod: "HMN2424", medida: 53 },{ cod: "HMN3232", medida: 57 },{ cod: "HFF0204", medida: 20 },
  { cod: "HFF0504", medida: 25 },{ cod: "HPAS06M1204", medida: 27 },{ cod: "HPAS06M1206", medida: 27 },
  { cod: "HPAS08M1404", medida: 30 },{ cod: "HPAS08M1406", medida: 30 },{ cod: "HPAS08M1604", medida: 30 },
  { cod: "HPAS10M1604", medida: 26 },{ cod: "HPAS10M1605", medida: 26 },{ cod: "HPAS10M1606", medida: 30 },
  { cod: "HPAS10M1608", medida: 30 },{ cod: "HPAS12M1804", medida: 25 },{ cod: "HPAS12M1805", medida: 25 },
  { cod: "HPAS12M1806", medida: 28 },{ cod: "HPAS12M1808", medida: 32 },{ cod: "HPAS12M2004", medida: 25 },
  { cod: "HPAS12M2005", medida: 25 },{ cod: "HPAS12M2005ZN", medida: 27 },{ cod: "HPAS12M2006", medida: 28 },
  { cod: "HPAS12M2008", medida: 28 },{ cod: "HPAS15M2206", medida: 27 },{ cod: "HPAS15M2208", medida: 26 },
  { cod: "HPAS15M2210", medida: 30 },{ cod: "HPAS16M2406", medida: 30 },{ cod: "HPAS16M2408", medida: 30 },
  { cod: "HPAS16M2408ZN", medida: 32 },{ cod: "HPAS16M2410", medida: 33 },{ cod: "HPAS16M2412", medida: 31 },
  { cod: "HPAS18M2608", medida: 33 },{ cod: "HPAS18M2610", medida: 33 },{ cod: "HPAS18M2612", medida: 37 },
  { cod: "HPAS20M3008", medida: 32 },{ cod: "HPAS20M3010", medida: 32 },{ cod: "HPAS20M3012", medida: 33 },
  { cod: "HPAS22M3010", medida: 32 },{ cod: "HPAS22M3012", medida: 33 },{ cod: "HPAS25M3612", medida: 37 },
  { cod: "HPAS25M3616", medida: 35 },{ cod: "HPAS28M3612", medida: 40 },{ cod: "HPAS28M3616", medida: 40 },
  { cod: "HPAS30M4212", medida: 40 },{ cod: "HPAS30M4216", medida: 40 },{ cod: "HPAS35M4516", medida: 50 },
  { cod: "HPAS35M4520", medida: 48 },{ cod: "HPAS38M5220", medida: 50 },{ cod: "HPAS38M5224", medida: 50 },
  { cod: "HPAS42M5220", medida: 50 },{ cod: "HPAS42M5224", medida: 50 },{ cod: "HPAS42M5232", medida: 50 },
  { cod: "HPAS4510M1604", medida: 50 },{ cod: "HPAS4510M1606", medida: 45 },{ cod: "HPAS4512M1805", medida: 55 },
  { cod: "HPAS4512M1806", medida: 45 },{ cod: "HPAS4512M1808", medida: 60 },{ cod: "HPAS4512M2004", medida: 44 },
  { cod: "HPAS4512M2006", medida: 45 },{ cod: "HPAS4512M2008", medida: 45 },{ cod: "HPAS4515M2208", medida: 65 },
  { cod: "HPAS4515M2206", medida: 65 },{ cod: "HPAS4515M2210", medida: 65 },{ cod: "HPAS4516M2408", medida: 60 },
  { cod: "HPAS4518M2610", medida: 70 },{ cod: "HPAS4518M2612", medida: 70 },{ cod: "HPAS4520M3010", medida: 76 },
  { cod: "HPAS4520M3012", medida: 76 },{ cod: "HPAS4525M3612", medida: 80 },{ cod: "HPAS9006M1204", medida: 25 },
  { cod: "HPAS9006M1604", medida: 25 },{ cod: "HPAS9010M1604", medida: 30 },{ cod: "HPAS9010M1605", medida: 35 },
  { cod: "HPAS9010M1606", medida: 35 },{ cod: "HPAS9012M1804", medida: 35 },{ cod: "HPAS9012M1808", medida: 43 },
  { cod: "HPAS9012M1806", medida: 39 },{ cod: "HPAS9012M2004", medida: 34 },{ cod: "HPAS9012M2005", medida: 35 },
  { cod: "HPAS90L12M2006", medida: 35 },{ cod: "HPAS9012M2006", medida: 38 },{ cod: "HPAS9012M2008", medida: 40 },
  { cod: "HPAS9015M2206", medida: 38 },{ cod: "HPAS9015M2208", medida: 40 },{ cod: "HPAS9015M2210", medida: 45 },
  { cod: "HPAS9016M2406", medida: 39 },{ cod: "HPAS9016M2408", medida: 40 },{ cod: "HPAS9016M2410", medida: 50 },
  { cod: "HPAS9016M2412", medida: 51 },{ cod: "HPAS9018M2610", medida: 55 },{ cod: "HPAS9018M2612", medida: 52 },
  { cod: "HPAS9020M3010", medida: 52 },{ cod: "HPAS9020M3012", medida: 48 },{ cod: "HPAS9022M3012", medida: 53 },
  { cod: "HPAS9025M3412", medida: 59 },{ cod: "HPAS9025M3612", medida: 58 },{ cod: "HPAS9025M3616", medida: 68 },
  { cod: "HPAS9028M3616", medida: 70 },{ cod: "HPAS9038M5224", medida: 85 },{ cod: "HPAS9042M5220", medida: 85 },
  { cod: "HPAS9042M5224", medida: 90 },{ cod: "HPAS90L12M1806", medida: 35 },{ cod: "HPAS90L15M2208", medida: 38 },
  { cod: "HPAS90L16M2408", medida: 42 },{ cod: "HPAS90L12M2004", medida: 31 },{ cod: "HPAS90L12M2005", medida: 33 },
  { cod: "HPT10M1604", medida: 30 },{ cod: "HPT10M1606", medida: 27 },{ cod: "HPT12M1804", medida: 26 },
  { cod: "HPT12M1808", medida: 31 },{ cod: "HPT12M2004", medida: 29 },{ cod: "HPT12M2005", medida: 28 },
  { cod: "HPT12M1806", medida: 28 },{ cod: "HPT12M2006", medida: 29 },{ cod: "HPT12M2008", medida: 31 },
  { cod: "HPT15M2206", medida: 31 },{ cod: "HPT15M2208", medida: 31 },{ cod: "HPT16M2408", medida: 31 },
  { cod: "HPT18M2610", medida: 31 },{ cod: "HPT22M3012", medida: 34 },{ cod: "HPT25M3612", medida: 50 },
  { cod: "HPT25M3616", medida: 40 },{ cod: "HPTI25M3616", medida: 42 },{ cod: "HPL901004", medida: 23 },
  { cod: "HMP0808", medida: 28 },{ cod: "HFL11616PP4", medida: 50 },{ cod: "HFL11616", medida: 65 },
  { cod: "HFL12424", medida: 76 },{ cod: "HFL1902016", medida: 70 },{ cod: "HFL2902016", medida: 73 },
  { cod: "HFL2901612", medida: 60 },{ cod: "HFL2901212", medida: 55 },{ cod: "HFL1901208", medida: 46 },
  { cod: "HFL1I1212", medida: 60 },{ cod: "HFL1I901212", medida: 70 },{ cod: "HFL2I1616", medida: 60 },
  { cod: "HFL2I2016", medida: 75 },{ cod: "HFL11351212", medida: 65 },{ cod: "HFL1451612", medida: 75 },
  { cod: "HFL1901612", medida: 55 },{ cod: "HFL1901616", medida: 67 },{ cod: "HFL1902020", medida: 80 },
  { cod: "HFL2901616", medida: 85 },{ cod: "HFL2I451616", medida: 85 },{ cod: "HFLC451616", medida: 85 },
  { cod: "HFLC901616", medida: 69 },{ cod: "HFL1671616", medida: 105 },{ cod: "HFLC1612", medida: 65 },
  { cod: "HFLC1616", medida: 65 },{ cod: "HFLC2424", medida: 80 },{ cod: "HFLCI1616", medida: 63 },
  { cod: "HFLCI901616", medida: 90 },{ cod: "HFLCI902016", medida: 70 },{ cod: "HFLC90L1616H114", medida: 82 },
  { cod: "HFL11208", medida: 57 },{ cod: "HFL11212", medida: 63 },{ cod: "HFL11612", medida: 61 },
  { cod: "HFL12420", medida: 75 },{ cod: "HFL13220", medida: 85 },{ cod: "HFL11212PP4", medida: 45 },
  { cod: "HFL21616", medida: 66 },{ cod: "HFL22016", medida: 69 },{ cod: "HFL1901212", medida: 62 },
  { cod: "HFL190L1612H100", medida: 68 },{ cod: "HFL190L1212H100", medida: 85 },{ cod: "HFL190L1616H160", medida: 81 },
  { cod: "HFL190L1616H140", medida: 81 },{ cod: "HFL190L1616H90", medida: 77 },{ cod: "HFL190L2020H120", medida: 85 },
  { cod: "HFL1903224", medida: 100 },{ cod: "HFL2I3232", medida: 93 },{ cod: "HFL2I901212", medida: 75 },
  { cod: "HFL2I901612", medida: 75 },{ cod: "HFL2I901616", medida: 78 },{ cod: "HFL1I902420", medida: 70 },
  { cod: "HFL1902424", medida: 100 },{ cod: "HFL2I902424", medida: 78 },{ cod: "HFL2I903232", medida: 135 },
  { cod: "HFL2I2424", medida: 78 },{ cod: "HKC2206PA", medida: 30 },{ cod: "HO1004", medida: 22 },
  { cod: "HO1204", medida: 22 },{ cod: "HO1206", medida: 24 },{ cod: "HO1806", medida: 27 },
  { cod: "HOB0604", medida: 27 },{ cod: "HO1808", medida: 30 },{ cod: "HFP0404", medida: 22 },
  { cod: "HFP0404SD", medida: 29 },{ cod: "HFP90L0604", medida: 35 },{ cod: "HFP900404", medida: 30 },
  { cod: "HFP0604SD", medida: 30 },{ cod: "HFP0605", medida: 23 },{ cod: "HFP0606SD", medida: 29 },
  { cod: "HFP0606", medida: 21 },{ cod: "HFP900806", medida: 39 },{ cod: "HFP90L0806", medida: 35 },
  { cod: "HFP900606", medida: 34 },{ cod: "HMP1008", medida: 33 },{ cod: "HMP1210", medida: 37 },
  { cod: "HMO0808", medida: 27 },{ cod: "HMO1006", medida: 29 },{ cod: "HMO1010", medida: 34 },
  { cod: "HMP1616", medida: 42 },{ cod: "HMP2016", medida: 41 },{ cod: "HMP2020", medida: 43 },
  { cod: "HFP0806SD", medida: 32 },{ cod: "HMP0806", medida: 30 },{ cod: "HFP0808", medida: 26 },
  { cod: "HFP0808SD", medida: 27 },{ cod: "HFP90L0606", medida: 35 },{ cod: "HFP900808", medida: 40 },
  { cod: "HFP90L0808", medida: 47 },{ cod: "HFP1216", medida: 40 },{ cod: "HFP1616", medida: 39 },
  { cod: "HFP1616SD", medida: 50 },{ cod: "HFP1008SD", medida: 29 },{ cod: "HFP1010SD", medida: 31 },
  { cod: "HFP1012", medida: 31 },{ cod: "HFP1208", medida: 33 },{ cod: "HFP1212SD", medida: 48 },
  { cod: "HFP1212", medida: 23 },{ cod: "HFP2020SD", medida: 55 },{ cod: "HFP901012", medida: 57 },
  { cod: "HFP901212", medida: 55 },{ cod: "HFP902020", medida: 80 },{ cod: "HFP900804", medida: 27 },
  { cod: "HFP90L1008", medida: 48 },{ cod: "HFP902024", medida: 95 },{ cod: "HFPI1616", medida: 45 },
  { cod: "HFP901616PP", medida: 82 },{ cod: "HFP901616", medida: 65 },{ cod: "HFPI901616", medida: 90 },
  { cod: "HFP450404", medida: 45 },{ cod: "HFP450604", medida: 42 },{ cod: "HFP450606", medida: 65 },
  { cod: "HFP450808", medida: 60 },{ cod: "HFP450810", medida: 69 },{ cod: "HFP451212", medida: 75 },
  { cod: "HFP451616", medida: 90 },{ cod: "HFP452020", medida: 105 },{ cod: "HWEO1212", medida: 47 },
  { cod: "HFP2024", medida: 43 },{ cod: "HFB0403MC", medida: 24 },{ cod: "HFM1603MC", medida: 30 },
  { cod: "HMFC12AP", medida: 32 },{ cod: "HMFC16AP", medida: 36 },{ cod: "HMGC12AP", medida: 42 },
  { cod: "HTCC48", medida: 70 },{ cod: "HMGC16AP", medida: 50 },{ cod: "HFB0402MC", medida: 24 },
  { cod: "HFM1602MC", medida: 30 },
];

// ── Estado ──
const _mcState = { a: null, b: null, activeIdx: { a: -1, b: -1 } };

// ── Autocomplete ──

function mcAcInput(lado) {
  const q = document.getElementById('mc-input-' + lado).value.toUpperCase().trim();
  _mcState[lado] = null;                    // limpa seleção ao editar
  document.getElementById('mc-input-' + lado).classList.remove('selected');
  _mcShowDrop(lado, q);
  calcularMedidaCorte();
}

function mcAcOpen(lado) {
  const inp = document.getElementById('mc-input-' + lado);
  // Se já tem seleção, limpa o campo para digitar novo
  if (_mcState[lado]) {
    inp.value = '';
    inp.classList.remove('selected');
    _mcState[lado] = null;
    calcularMedidaCorte();
  }
  const q = inp.value.toUpperCase().trim();
  _mcShowDrop(lado, q);
}

function _mcShowDrop(lado, q) {
  const drop = document.getElementById('mc-drop-' + lado);
  const resultados = q.length === 0
    ? TERMINAIS.slice(0, 40)                // mostra primeiros 40 sem filtro
    : TERMINAIS.filter(t => t.cod.includes(q));

  if (resultados.length === 0) {
    drop.innerHTML = '<div class="mc-ac-empty">Nenhum terminal encontrado</div>';
  } else {
    drop.innerHTML = resultados.map((t, i) => {
      const medStr = t.medida != null ? `${t.medida} mm` : 'sem medida';
      const semCls = t.medida == null ? ' sem-medida' : '';
      // destaca o trecho digitado
      const destaque = q
        ? t.cod.replace(q, `<strong>${q}</strong>`)
        : t.cod;
      return `<div class="mc-ac-item${semCls}" data-idx="${i}" data-cod="${t.cod}"
                onmousedown="mcAcSelect('${lado}','${t.cod}')">
                <span class="cod">${destaque}</span>
                <span class="med">${medStr}</span>
              </div>`;
    }).join('');
  }

  _mcState.activeIdx[lado] = -1;
  drop.classList.add('open');
}

function mcAcSelect(lado, cod) {
  const t = TERMINAIS.find(x => x.cod === cod);
  if (!t) return;
  _mcState[lado] = t;
  const inp = document.getElementById('mc-input-' + lado);
  const medStr = t.medida != null ? '  (' + t.medida + ' mm)' : '  (sem medida)';
  inp.value = t.cod + medStr;
  inp.classList.add('selected');
  document.getElementById('mc-drop-' + lado).classList.remove('open');
  calcularMedidaCorte();
}

function mcAcKey(e, lado) {
  const drop = document.getElementById('mc-drop-' + lado);
  const items = drop.querySelectorAll('.mc-ac-item');
  let idx = _mcState.activeIdx[lado];

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    idx = Math.min(idx + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    idx = Math.max(idx - 1, 0);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (idx >= 0 && items[idx]) {
      mcAcSelect(lado, items[idx].dataset.cod);
    } else if (items.length === 1) {
      mcAcSelect(lado, items[0].dataset.cod);
    }
    return;
  } else if (e.key === 'Escape') {
    drop.classList.remove('open');
    return;
  } else { return; }

  _mcState.activeIdx[lado] = idx;
  items.forEach((el, i) => el.classList.toggle('active', i === idx));
  if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
}

function _mcRenderTag(lado) {
  // mantido por compatibilidade — lógica migrada para mcAcSelect
}

function mcAcClear(lado) {
  _mcState[lado] = null;
  const inp = document.getElementById('mc-input-' + lado);
  inp.value = '';
  inp.classList.remove('selected');
  document.getElementById('mc-drop-' + lado).classList.remove('open');
  calcularMedidaCorte();
}

// Fecha dropdown ao clicar fora
document.addEventListener('click', e => {
  ['a','b'].forEach(lado => {
    const wrap = document.getElementById('mc-wrap-' + lado);
    if (wrap && !wrap.contains(e.target)) {
      document.getElementById('mc-drop-' + lado)?.classList.remove('open');
    }
  });
});

// ── Cálculo ──
function calcularMedidaCorte() {
  const comp = parseFloat(document.getElementById('mc-comprimento')?.value);
  const tA = _mcState.a;
  const tB = _mcState.b;
  const resultBox   = document.getElementById('mc-result');
  const resultValue = document.getElementById('mc-result-value');
  const formula     = document.getElementById('mc-formula');

  if (!tA || !tB || isNaN(comp) || comp <= 0) {
    resultBox?.classList.add('hidden');
    return;
  }

  if (tA.medida == null || tB.medida == null) {
    resultBox?.classList.remove('hidden');
    resultValue.textContent = '— mm';
    resultValue.style.color = '#ef4444';
    formula.textContent = 'Terminal sem medida cadastrada';
    return;
  }

  const resultado = comp - tA.medida - tB.medida - 10;

  // Formato: vírgula como separador de milhar (ex: 2,940 mm)
  function fmtMm(val) {
    const intPart = Math.floor(Math.abs(val));
    const decPart = Math.abs(val) % 1;
    const sign = val < 0 ? '-' : '';
    // formata inteiro com vírgula a cada 3 dígitos
    const intFmt = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (decPart === 0) return sign + intFmt;
    const decStr = decPart.toFixed(1).slice(1); // ".X"
    return sign + intFmt + decStr;
  }
  const fmt = fmtMm(resultado);

  resultValue.textContent = fmt + ' mm';
  resultValue.style.color = resultado > 0 ? '#ffffff' : '#ef4444';
  formula.textContent = `${comp} − ${tA.medida} − ${tB.medida} − 10 = ${fmt} mm`;
  resultBox?.classList.remove('hidden');
}

function resetMedidaCorte() {
  ['a','b'].forEach(lado => {
    _mcState[lado] = null;
    const inp = document.getElementById('mc-input-' + lado);
    if (inp) { inp.value = ''; inp.classList.remove('selected'); inp.placeholder = 'Digite o código do terminal...'; }
    document.getElementById('mc-drop-' + lado)?.classList.remove('open');
  });
  const c = document.getElementById('mc-comprimento');
  if (c) c.value = '';
  document.getElementById('mc-result')?.classList.add('hidden');
}
