const fullList = ['SPY','QQQ','AAPL','MSFT','GOOG','TSLA','AMZN','META','JNJ','NVDA','XOM','JPM','WMT','CVX','PFE','BAC','KO','VZ','ORCL','ADBE','CSCO','ANET','HOOD','DIS','MCD','NKE','BMY','INTC','QCOM','AMD','T','RTX','SCHW','C','PYPL','SBUX','MO','MMM','DUK','GE','GILD','TGT','MU','TFC','FDX','OXY','AON','BSX','FCX','NVO','VLO','GM','F','UBER','MRVL','W','BOX','DKNG','PTON','SHAK','CL','PEP','BUD','GIS','COF','GS','BK','MRNA','VEEV','COIN','BA','NFLX','VOYA','SKWS','SNOW','O','KMI','KR','WBD','LULU','WBA','HLT','JCI','SPG','HAL','CARR','TSN','VICI','LEN','LYV','CFG','HPE','ARES','PLTR','EXPE','BBY','WAB','TW','HEI','SYF','DGX','WPC','COO','WDC','LPLA','CAG','DOCU','SWKS','TRGP','ACI','HUBS','TER','SPLK','POOL','DRI','EQT','NTAP','NET','EVRG','IRM','STLD','PODD','BMRN','CPB','RKT','SJM','AES','OVV','OKTA','VTRS','CHRW','HST','MGM','PINS','BEN','UAL','LLY','TAP','DT','U','DINO','CHK','CCL','BURL','VST','BLDR','EWBC','CLF','LW','BSY','UHAL','WSO','H','ACM','NBIX','PLUG','OGN','DVA','AAL','WSM','PAG','BJ','WAL','WBS','LSXMK','CBSH','OC','UHS','MAT','NWL','ARMK','JBL','SPOT','BBWI','S','TSM','AVGO','CRM','ACN','INTU','AMAT','LRCX','ADI','KLAC','SNPS','CDNS','ANET','MCHP','FTNT','ON','IT','MPWR','KEYS','TDY','ENPH','EPAM','QRVO','AMKR','SPSC','LFUS','CRUS','PLUS','V','MA','SPGI','BLK','FI','ICE','MCO','AMP','NDAQ','DFS','IBKR','SHOP','MDB','KMB','DAL','DBX','TMUS','TWLO','MTCH','Z','PLAY','EA','BIDU','BABA','JD','SLB','SF','EVR','FFIN','WD','ABCB','SNEX','VRTS','UNH','ABBV','TMO','ISRG','ELV','VRTX','REGN','HCA','DXCM','EW','CNC','APTV','WST','RMD','MOH','TECH','CRL','RGEN','CPRT','ODFL','GWW','URI','BR','AXON','EXPD','LII','PAYC','SAIA','EME','FIX','LSTR','PGTI','HD','LOW','DHI','ULTA','TSCO','PHM','DECK','DPZ','KMX','DKS','BLD','FIVE','TPX','MUSA','MTH','THO','IBP','ABG','GPI','FOXF','PATK','XPEL','AXP','CRMT','COST','DG','COKE','IPAR','CENTA','GOOGL','CHTR','SHW','NUE','ALB','RS','BERY','EXP','LPX','PXD','MTDR','NRG','AMT','CSGP','EXR','CBRE','SBAC'];

export const CurrentStockList = fullList.map(s => {
    return { ticker: s };
});