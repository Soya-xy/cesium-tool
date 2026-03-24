export const TIANDITU_KEY = '789e558be762ff832392a0393fd8a4f1'

export const TIANDITU_IMG_URL = `https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={TileCol}&TILEROW={TileRow}&TILEMATRIX={TileMatrix}&tk=${TIANDITU_KEY}`

export const TIANDITU_CIA_URL = `https://t{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={TileCol}&TILEROW={TileRow}&TILEMATRIX={TileMatrix}&tk=${TIANDITU_KEY}`

export const TIANDITU_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7']
