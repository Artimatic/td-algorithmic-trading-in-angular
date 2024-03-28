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
    'ANET',
    'HOOD',
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
    'HIG',
    'BK',
    'MRNA',
    'VEEV',
    'COIN',
    'BA',
    'NFLX',
    'VOYA',
    'SKWS',
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
    'LPLA',
    'CAG',
    'DOCU',
    'SWKS',
    'TRGP',
    'ACI',
    'HUBS',
    'TER',
    'SPLK',
    'POOL',
    'DRI',
    'EQT',
    'NTAP',
    'NET',
    'EVRG',
    'IRM',
    'STLD',
    'PODD',
    'BMRN',
    'CPB',
    'RKT',
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
    'PINS',
    'BEN',
    'EMN',
    'UAL',
    'MAS',
    'LLY',
    'TAP',
    'DT',
    'U',
    'DINO',
    'CHK',
    'CCL',
    'BURL',
    'VST',
    'BLDR',
    'EWBC',
    'CLF',
    'FFIV',
    'LW',
    'GL',
    'BSY',
    'UHAL',
    'WSO',
    'H',
    'ACM',
    'NBIX',
    'AOS',
    'PLUG',
    'OGN',
    'DVA',
    'AAL',
    'WSM',
    'BWA',
    'PAG',
    'BJ',
    'WAL',
    'WBS',
    'LSXMK',
    'CBSH',
    'OC',
    'UHS',
    'RRX',
    'MAT',
    'NWL',
    'ARMK',
    'JBL',
    'BBWI',
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
    'SPSC',
    'MKSI',
    'LFUS',
    'ARW',
    'CRUS',
    'DIOD',
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
    'IBKR',
    'KNSL',
    'SF',
    'EVR',
    'FFIN',
    'WD',
    'ABCB',
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
    'APTV',
    'WST',
    'RMD',
    'MOH',
    'LH',
    'HOLX',
    'TECH',
    'CRL',
    'RGEN',
    'ENSG',
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
    'TREX',
    'TTEK',
    'FIX',
    'LSTR',
    'AAON',
    'EXLS',
    'ASGN',
    'NSP',
    'ALG',
    'PGTI',
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
    'TPX',
    'TXRH',
    'MUSA',
    'MTH',
    'THO',
    'TMHC',
    'IBP',
    'ABG',
    'GPI',
    'CCS',
    'FOXF',
    'PATK',
    'XPEL',
    'AXP',
    'SCVL',
    'CRMT',
    'COST',
    'DG',
    'COKE',
    'IPAR',
    'CENTA',
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
    'PXD',
    'MTDR',
    'NRG',
    'AMT',
    'CSGP',
    'EXR',
    'CBRE',
    'SBAC',
    'TQQQ',
    'UPRO',
    'SHOP',
    'MDB',
    'KMB',
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
    'JD',
    'SLB'];

export const CurrentStockList = fullList.map(s => {
    return { ticker: s };
});