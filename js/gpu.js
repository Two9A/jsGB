GPU = {
  _vram: [],
  _oam: [],
  _reg: [],
  _tilemap: [],
  _objdata: [],
  _objdatasorted: [],
  _palette: {'bg':[], 'obj0':[], 'obj1':[]},
  _scanrow: [],

  _curline: 0,
  _curscan: 0,
  _linemode: 0,
  _modeclocks: 0,

  _yscrl: 0,
  _xscrl: 0,
  _raster: 0,
  _ints: 0,
  
  _lcdon: 0,
  _bgon: 0,
  _objon: 0,
  _winon: 0,

  _objsize: 0,

  _bgtilebase: 0x0000,
  _bgmapbase: 0x1800,
  _wintilebase: 0x1800,

  reset: function() {
    for(var i=0; i<8192; i++) {
      GPU._vram[i] = 0;
    }
    for(i=0; i<160; i++) {
      GPU._oam[i] = 0;
    }
    for(i=0; i<4; i++) {
      GPU._palette.bg[i] = 255;
      GPU._palette.obj0[i] = 255;
      GPU._palette.obj1[i] = 255;
    }
    for(i=0;i<512;i++)
    {
      GPU._tilemap[i] = [];
      for(j=0;j<8;j++)
      {
        GPU._tilemap[i][j] = [];
        for(k=0;k<8;k++)
        {
          GPU._tilemap[i][j][k] = 0;
        }
      }
    }

    LOG.out('GPU', 'Initialising screen.');
    var c = document.getElementById('screen');
    if(c && c.getContext)
    {
      GPU._canvas = c.getContext('2d');
      if(!GPU._canvas)
      {
        throw new Error('GPU: Canvas context could not be created.');
      }
      else
      {
        if(GPU._canvas.createImageData)
          GPU._scrn = GPU._canvas.createImageData(160,144);
        else if(GPU._canvas.getImageData)
          GPU._scrn = GPU._canvas.getImageData(0,0,160,144);
        else
          GPU._scrn = {'width':160, 'height':144, 'data':new Array(160*144*4)};

        for(i=0; i<GPU._scrn.data.length; i++)
          GPU._scrn.data[i]=255;

        GPU._canvas.putImageData(GPU._scrn, 0,0);
      }
    }

    GPU._curline=0;
    GPU._curscan=0;
    GPU._linemode=2;
    GPU._modeclocks=0;
    GPU._yscrl=0;
    GPU._xscrl=0;
    GPU._raster=0;
    GPU._ints = 0;

    GPU._lcdon = 0;
    GPU._bgon = 0;
    GPU._objon = 0;
    GPU._winon = 0;

    GPU._objsize = 0;
    for(i=0; i<160; i++) GPU._scanrow[i] = 0;

    for(i=0; i<40; i++)
    {
      GPU._objdata[i] = {'y':-16, 'x':-8, 'tile':0, 'palette':0, 'yflip':0, 'xflip':0, 'prio':0, 'num':i};
    }

    // Set to values expected by BIOS, to start
    GPU._bgtilebase = 0x0000;
    GPU._bgmapbase = 0x1800;
    GPU._wintilebase = 0x1800;

    LOG.out('GPU', 'Reset.');
  },

  checkline: function() {
    GPU._modeclocks += Z80._r.m;
    switch(GPU._linemode)
    {
      // In hblank
      case 0:
        if(GPU._modeclocks >= 51)
        {
          // End of hblank for last scanline; render screen
          if(GPU._curline == 143)
          {
            GPU._linemode = 1;
            GPU._canvas.putImageData(GPU._scrn, 0,0);
            MMU._if |= 1;
          }
          else
          {
            GPU._linemode = 2;
          }
          GPU._curline++;
	  GPU._curscan += 640;
          GPU._modeclocks=0;
        }
        break;

      // In vblank
      case 1:
        if(GPU._modeclocks >= 114)
        {
          GPU._modeclocks = 0;
          GPU._curline++;
          if(GPU._curline > 153)
          {
            GPU._curline = 0;
	    GPU._curscan = 0;
            GPU._linemode = 2;
          }
        }
        break;

      // In OAM-read mode
      case 2:
        if(GPU._modeclocks >= 20)
        {
          GPU._modeclocks = 0;
          GPU._linemode = 3;
        }
        break;

      // In VRAM-read mode
      case 3:
        // Render scanline at end of allotted time
        if(GPU._modeclocks >= 43)
        {
          GPU._modeclocks = 0;
          GPU._linemode = 0;
          if(GPU._lcdon)
          {
            if(GPU._bgon)
            {
              var linebase = GPU._curscan;
              var mapbase = GPU._bgmapbase + ((((GPU._curline+GPU._yscrl)&255)>>3)<<5);
              var y = (GPU._curline+GPU._yscrl)&7;
              var x = GPU._xscrl&7;
              var t = (GPU._xscrl>>3)&31;
              var pixel;
              var w=160;

              if(GPU._bgtilebase)
              {
	        var tile = GPU._vram[mapbase+t];
		if(tile<128) tile=256+tile;
                var tilerow = GPU._tilemap[tile][y];
                do
                {
		  GPU._scanrow[160-x] = tilerow[x];
                  GPU._scrn.data[linebase+3] = GPU._palette.bg[tilerow[x]];
                  x++;
                  if(x==8) { t=(t+1)&31; x=0; tile=GPU._vram[mapbase+t]; if(tile<128) tile=256+tile; tilerow = GPU._tilemap[tile][y]; }
                  linebase+=4;
                } while(--w);
              }
              else
              {
                var tilerow=GPU._tilemap[GPU._vram[mapbase+t]][y];
                do
                {
		  GPU._scanrow[160-x] = tilerow[x];
                  GPU._scrn.data[linebase+3] = GPU._palette.bg[tilerow[x]];
                  x++;
                  if(x==8) { t=(t+1)&31; x=0; tilerow=GPU._tilemap[GPU._vram[mapbase+t]][y]; }
                  linebase+=4;
                } while(--w);
	      }
            }
            if(GPU._objon)
            {
              var cnt = 0;
              if(GPU._objsize)
              {
                for(var i=0; i<40; i++)
                {
                }
              }
              else
              {
                var tilerow;
                var obj;
                var pal;
                var pixel;
                var x;
                var linebase = GPU._curscan;
                for(var i=0; i<40; i++)
                {
                  obj = GPU._objdatasorted[i];
                  if(obj.y <= GPU._curline && (obj.y+8) > GPU._curline)
                  {
                    if(obj.yflip)
                      tilerow = GPU._tilemap[obj.tile][7-(GPU._curline-obj.y)];
                    else
                      tilerow = GPU._tilemap[obj.tile][GPU._curline-obj.y];

                    if(obj.palette) pal=GPU._palette.obj1;
                    else pal=GPU._palette.obj0;

                    linebase = (GPU._curline*160+obj.x)*4;
                    if(obj.xflip)
                    {
                      for(x=0; x<8; x++)
                      {
                        if(obj.x+x >=0 && obj.x+x < 160)
                        {
                          if(tilerow[7-x] && (obj.prio || !GPU._scanrow[x]))
                          {
                            GPU._scrn.data[linebase+3] = pal[tilerow[7-x]];
                          }
                        }
                        linebase+=4;
                      }
                    }
                    else
                    {
                      for(x=0; x<8; x++)
                      {
                        if(obj.x+x >=0 && obj.x+x < 160)
                        {
                          if(tilerow[x] && (obj.prio || !GPU._scanrow[x]))
                          {
                            GPU._scrn.data[linebase+3] = pal[tilerow[x]];
                          }
                        }
                        linebase+=4;
                      }
                    }
                    cnt++; if(cnt>10) break;
                  }
                }
              }
            }
          }
        }
        break;
    }
  },

  updatetile: function(addr,val) {
    var saddr = addr;
    if(addr&1) { saddr--; addr--; }
    var tile = (addr>>4)&511;
    var y = (addr>>1)&7;
    var sx;
    for(var x=0;x<8;x++)
    {
      sx=1<<(7-x);
      GPU._tilemap[tile][y][x] = ((GPU._vram[saddr]&sx)?1:0) | ((GPU._vram[saddr+1]&sx)?2:0);
    }
  },

  updateoam: function(addr,val) {
    addr-=0xFE00;
    var obj=addr>>2;
    if(obj<40)
    {
      switch(addr&3)
      {
        case 0: GPU._objdata[obj].y=val-16; break;
        case 1: GPU._objdata[obj].x=val-8; break;
        case 2:
          if(GPU._objsize) GPU._objdata[obj].tile = (val&0xFE);
          else GPU._objdata[obj].tile = val;
          break;
        case 3:
          GPU._objdata[obj].palette = (val&0x10)?1:0;
          GPU._objdata[obj].xflip = (val&0x20)?1:0;
          GPU._objdata[obj].yflip = (val&0x40)?1:0;
          GPU._objdata[obj].prio = (val&0x80)?1:0;
          break;
     }
    }
    GPU._objdatasorted = GPU._objdata;
    GPU._objdatasorted.sort(function(a,b){
      if(a.x>b.x) return -1;
      if(a.num>b.num) return -1;
    });
  },

  rb: function(addr) {
    var gaddr = addr-0xFF40;
    switch(gaddr)
    {
      case 0:
        return (GPU._lcdon?0x80:0)|
               ((GPU._bgtilebase==0x0000)?0x10:0)|
               ((GPU._bgmapbase==0x1C00)?0x08:0)|
               (GPU._objsize?0x04:0)|
               (GPU._objon?0x02:0)|
               (GPU._bgon?0x01:0);

      case 1:
        return (GPU._curline==GPU._raster?4:0)|GPU._linemode;

      case 2:
        return GPU._yscrl;

      case 3:
        return GPU._xscrl;

      case 4:
        return GPU._curline;

      case 5:
        return GPU._raster;

      default:
        return GPU._reg[gaddr];
    }
  },

  wb: function(addr,val) {
    var gaddr = addr-0xFF40;
    GPU._reg[gaddr] = val;
    switch(gaddr)
    {
      case 0:
        GPU._lcdon = (val&0x80)?1:0;
        GPU._bgtilebase = (val&0x10)?0x0000:0x0800;
        GPU._bgmapbase = (val&0x08)?0x1C00:0x1800;
        GPU._objsize = (val&0x04)?1:0;
        GPU._objon = (val&0x02)?1:0;
        GPU._bgon = (val&0x01)?1:0;
        break;

      case 2:
        GPU._yscrl = val;
        break;

      case 3:
        GPU._xscrl = val;
        break;

      case 5:
        GPU._raster = val;

      // OAM DMA
      case 6:
        var v;
        for(var i=0; i<160; i++)
        {
          v = MMU.rb((val<<8)+i);
          GPU._oam[i] = v;
          GPU.updateoam(0xFE00+i, v);
        }
        break;

      // BG palette mapping
      case 7:
        for(var i=0;i<4;i++)
        {
          switch((val>>(i*2))&3)
          {
            case 0: GPU._palette.bg[i] = 255; break;
            case 1: GPU._palette.bg[i] = 192; break;
            case 2: GPU._palette.bg[i] = 96; break;
            case 3: GPU._palette.bg[i] = 0; break;
          }
        }
        break;

      // OBJ0 palette mapping
      case 8:
        for(var i=0;i<4;i++)
        {
          switch((val>>(i*2))&3)
          {
            case 0: GPU._palette.obj0[i] = 255; break;
            case 1: GPU._palette.obj0[i] = 192; break;
            case 2: GPU._palette.obj0[i] = 96; break;
            case 3: GPU._palette.obj0[i] = 0; break;
          }
        }
        break;

      // OBJ1 palette mapping
      case 9:
        for(var i=0;i<4;i++)
        {
          switch((val>>(i*2))&3)
          {
            case 0: GPU._palette.obj1[i] = 255; break;
            case 1: GPU._palette.obj1[i] = 192; break;
            case 2: GPU._palette.obj1[i] = 96; break;
            case 3: GPU._palette.obj1[i] = 0; break;
          }
        }
        break;
    }
  }
};
