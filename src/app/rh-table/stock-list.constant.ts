const fullList = ['SPY',
    'QQQ',
    'AAPL',
    'MSFT',
    'GOOG',
    'TSLA',
    'AMZN',
    'META',
    'JNJ',
    'NVDA',
    'XOM',
    'JPM',
    'WMT',
    'CVX',
    'PFE',
    'BAC',
    'KO',
    'VZ',
    'ORCL',
    'ADBE',
    'CSCO',
    'DIS',
    'MCD',
    'NKE',
    'BMY',
    'INTC',
    'QCOM',
    'AMD',
    'T',
    'RTX',
    'SCHW',
    'C',
    'PYPL',
    'SBUX',
    'MO',
    'MMM',
    'DUK',
    'GE',
    'GILD',
    'TGT',
    'MU',
    'TFC',
    'FDX',
    'OXY',
    'AON',
    'BSX',
    'FCX',
    'VLO',
    'GM',
    'F',
    'SCCO',
    'UBER',
    'MRVL',
    'SNOW',
    'O',
    'KMI',
    'KR',
    'WBD',
    'LULU',
    'WBA',
    'HLT',
    'JCI',
    'MSI',
    'SPG',
    'HAL',
    'CARR',
    'TSN',
    'VICI',
    'LEN',
    'LYV',
    'CFG',
    'HPE',
    'PWR',
    'ARES',
    'PLTR',
    'PARA',
    'ACGL',
    'EXPE',
    'BBY',
    'WAB',
    'TW',
    'HEI',
    'J',
    'SYF',
    'INCY',
    'DGX',
    'WPC',
    'TRU',
    'COO',
    'WDC',
    'GNRC',
    'LPLA',
    'CAG',
    'DOCU',
    'SWKS',
    'TRGP',
    'ACI',
    'HUBS',
    'BIO',
    'TER',
    'APA',
    'SPLK',
    'POOL',
    'DRI',
    'EQT',
    'NTAP',
    'BXP',
    'NET',
    'EVRG',
    'IRM',
    'STLD',
    'PODD',
    'BMRN',
    'CPB',
    'RKT',
    'FMC',
    'HWM',
    'SJM',
    'TXT',
    'AES',
    'OVV',
    'OKTA',
    'VTRS',
    'CHRW',
    'HST',
    'MGM',
    'DAR',
    'PINS',
    'BEN',
    'EMN',
    'ROKU',
    'UAL',
    'AR',
    'MAS',
    'HAS',
    'LLY',
    'FHN',
    'TAP',
    'DT',
    'U',
    'DINO',
    'CHK',
    'CCL',
    'AAP',
    'BURL',
    'HSIC',
    'VST',
    'GME',
    'BLDR',
    'EWBC',
    'CLF',
    'FFIV',
    'LW',
    'GL',
    'BSY',
    'UHAL',
    'CUBE',
    'WSO',
    'H',
    'SNX',
    'CZR',
    'CLVT',
    'ACM',
    'MTN',
    'NBIX',
    'AOS',
    'PLUG',
    'NLY',
    'MPW',
    'LNC',
    'OGN',
    'NFE',
    'DVA',
    'AAL',
    'WSM',
    'BWA',
    'UGI',
    'PAG',
    'ZION',
    'BJ',
    'WAL',
    'MHK',
    'WBS',
    'OLN',
    'JLL',
    'LSXMK',
    'LAD',
    'CBSH',
    'OC',
    'G',
    'CFR',
    'UHS',
    'RRX',
    'MAT',
    'NWL',
    'ARMK',
    'FRT',
    'JBL',
    'BBWI',
    'XRAY',
    'COLD',
    'S',
    'TSM',
    'AVGO',
    'CRM',
    'ACN',
    'INTU',
    'AMAT',
    'LRCX',
    'ADI',
    'KLAC',
    'SNPS',
    'CDNS',
    'ANET',
    'APH',
    'MCHP',
    'FTNT',
    'ON',
    'IT',
    'MPWR',
    'KEYS',
    'TDY',
    'ENPH',
    'EPAM',
    'QRVO',
    'OLED',
    'AMKR',
    'ONTO',
    'SPSC',
    'FN',
    'MKSI',
    'LFUS',
    'ARW',
    'NSIT',
    'CRUS',
    'AEIS',
    'DIOD',
    'PRGS',
    'PRFT',
    'PLUS',
    'V',
    'MA',
    'SPGI',
    'BLK',
    'FI',
    'ICE',
    'MCO',
    'MSCI',
    'AMP',
    'NDAQ',
    'DFS',
    'RJF',
    'BRO',
    'FDS',
    'MKTX',
    'IBKR',
    'KNSL',
    'PRI',
    'SF',
    'EVR',
    'FFIN',
    'WD',
    'ABCB',
    'SFBS',
    'BANF',
    'AX',
    'SNEX',
    'VRTS',
    'UNH',
    'ABBV',
    'TMO',
    'ISRG',
    'ELV',
    'VRTX',
    'REGN',
    'HCA',
    'DXCM',
    'EW',
    'CNC',
    'MTD',
    'WST',
    'RMD',
    'MOH',
    'LH',
    'HOLX',
    'TECH',
    'CRL',
    'RGEN',
    'ENSG',
    'QDEL',
    'UFPT',
    'LMAT',
    'CPRT',
    'ODFL',
    'GWW',
    'URI',
    'BR',
    'ROL',
    'AXON',
    'EXPD',
    'LII',
    'PAYC',
    'SAIA',
    'EME',
    'TTC',
    'PCTY',
    'TREX',
    'TTEK',
    'SSD',
    'UFPI',
    'FIX',
    'FCN',
    'LSTR',
    'AAON',
    'EXLS',
    'ASGN',
    'FELE',
    'EXPO',
    'NSP',
    'ALG',
    'MYRG',
    'PGTI',
    'NVEE',
    'MRTN',
    'FWRD',
    'HD',
    'LOW',
    'ORLY',
    'DHI',
    'AZO',
    'ULTA',
    'TSCO',
    'PHM',
    'DECK',
    'DPZ',
    'LKQ',
    'KMX',
    'DKS',
    'BLD',
    'FIVE',
    'ETSY',
    'TPX',
    'TXRH',
    'MUSA',
    'AN',
    'MTH',
    'THO',
    'TMHC',
    'RH',
    'IBP',
    'ABG',
    'GPI',
    'MDC',
    'MHO',
    'LGIH',
    'CCS',
    'CVCO',
    'FOXF',
    'BOOT',
    'PATK',
    'XPEL',
    'HIBB',
    'SCVL',
    'CRMT',
    'COST',
    'DG',
    'COKE',
    'IPAR',
    'CENT',
    'CENTA',
    'MGPI',
    'GOOGL',
    'CHTR',
    'TTGT',
    'SHW',
    'NUE',
    'ALB',
    'RS',
    'BERY',
    'EXP',
    'LPX',
    'WOR',
    'HWKN',
    'PXD',
    'MTDR',
    'NRG',
    'AMT',
    'CSGP',
    'EXR',
    'CBRE',
    'SBAC',
    'IRBT',
    'TQQQ',
    'UPRO',
    'SHOP',
    'MDB',
    'KMB',
    'SIX',
    'DAL',
    'DBX',
    'TMUS',
    'TWLO',
    'MTCH',
    'Z',
    'PLAY',
    'EA',
    'BIDU',
    'BABA',
    'WEN',
    'ALV',
    'JD',
    'W',
    'BOX',
    'DKNG',
    'PTON',
    'SHAK',
    'CL',
    'PEP',
    'BUD',
    'GIS',
    'COF',
    'GS',
    'SUN',
    'HIG',
    'BK',
    'MRNA',
    'VEEV',
    'KBH',
    'COIN',
    'BA',
    'NFLX',
    'VOYA',
    'SKWS'];

export const CurrentStockList = fullList.map(s => {
    return { ticker: s };
});