GPU = {
  _vram: [],
  _oam: [],
  _reg: [],
  _tilemap: [],
  _palette: {'bg':[], 'obj0':[], 'obj1':[]},

  _curline: 0,
  _linemode: 0,
  _modeclocks: 0,

  _yscrl: 0,
  _xscrl: 0,
  _raster: 0,
  _ints: 0,
  
  _lcdon: 0,
  _bgon: 0,

  _bgtilebase: 0x0000,
  _bgmapbase: 0x1800,

  reset: function() {
    for(var i=0; i<8192; i++) {
      GPU._vram[i] = 0;
    }
    for(i=0; i<160; i++) {
      GPU._oam[i] = 0;
    }
    for(i=0; i<4; i++) {
      GPU._palette.bg[i] = [255,255,255,255];
      GPU._palette.obj0[i] = [255,255,255,255];
      GPU._palette.obj1[i] = [255,255,255,255];
    }
    for(i=0;i<256;i++)
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
    GPU._linemode=2;
    GPU._modeclocks=0;
    GPU._yscrl=0;
    GPU._xscrl=0;
    GPU._raster=0;
    GPU._ints = 0;

    GPU._lcdon = 0;
    GPU._bgon = 0;

    // Set to values expected by BIOS, to start
    GPU._bgtilebase = 0x0000;
    GPU._bgmapbase = 0x1800;

    LOG.out('GPU', 'Reset.');
  },

  checkline: function() {
    GPU._modeclocks += Z80._r.t;
    switch(GPU._linemode)
    {
      case 0:
        if(GPU._modeclocks >= 204)
	{
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
	  GPU._modeclocks=0;
	}
	break;

      case 1:
        if(GPU._modeclocks >= 456)
	{
	  GPU._modeclocks = 0;
	  GPU._curline++;
	  if(GPU._curline > 153)
	  {
	    GPU._curline = 0;
	    GPU._linemode = 2;
	  }
	}
	break;

      case 2:
        if(GPU._modeclocks >= 80)
	{
	  GPU._modeclocks = 0;
	  GPU._linemode = 3;
	}
	break;

      case 3:
        if(GPU._modeclocks >= 172)
	{
	  GPU._modeclocks = 0;
	  GPU._linemode = 0;
	  if(GPU._lcdon)
	  {
	    if(GPU._bgon)
	    {
	      var linebase = GPU._curline*160*4;
	      var mapbase = GPU._bgmapbase + ((((GPU._curline+GPU._yscrl)&255)>>3)<<5);
	      var y = (GPU._curline+GPU._yscrl)&7;
	      var x = GPU._xscrl&7;
	      var t = (GPU._xscrl>>3)&31;
	      var tilerow = GPU._tilemap[GPU._vram[mapbase+t]][y];
	      var pixel;
	      var w=160;
	      do
	      {
	        pixel = GPU._palette.bg[tilerow[x]];
		GPU._scrn.data[linebase+0] = pixel[0];
		GPU._scrn.data[linebase+1] = pixel[1];
		GPU._scrn.data[linebase+2] = pixel[2];
		GPU._scrn.data[linebase+3] = pixel[3];
	        x++;
		if(x==8) { t=(t+1)&31; x=0; tilerow=GPU._tilemap[GPU._vram[mapbase+t]][y]; }
		linebase+=4;
              } while(--w);
	    }
	  }
	}
	break;
    }
  },

  updatetile: function(addr,val) {
    var saddr = addr;
    addr-=GPU._bgtilebase;
    if(addr>=0 && addr<0x1000)
    {
      if(addr&1) { saddr--; addr--; }
      var tile = (addr>>4)&255;
      var y = (addr>>1)&7;
      var sx;
      for(var x=0;x<8;x++)
      {
        sx=1<<(7-x);
        GPU._tilemap[tile][y][x] = ((GPU._vram[saddr]&sx)?1:0) | ((GPU._vram[saddr+1]&sx)?2:0);
      }
    }
  },

  rb: function(addr) {
    var gaddr = addr-0xFF40;
    switch(gaddr)
    {
      case 0:
        return (GPU._lcdon?0x80:0)|
	       ((GPU._bgtilebase==0x0000)?0x10:0)|
	       ((GPU._bgmapbase==0x1C00)?0x08:0)|
	       (GPU._bgon?1:0);

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

      // BG palette mapping
      case 7:
        for(var i=0;i<4;i++)
	{
	  switch((val>>(i*2))&3)
	  {
	    case 0: GPU._palette.bg[i] = [255,255,255,255]; break;
	    case 1: GPU._palette.bg[i] = [192,192,192,255]; break;
	    case 2: GPU._palette.bg[i] = [96,96,96,255]; break;
	    case 3: GPU._palette.bg[i] = [0,0,0,255]; break;
	  }
	}
	break;

      // OBJ0 palette mapping
      case 8:
        for(var i=0;i<4;i++)
	{
	  switch((val>>(i*2))&3)
	  {
	    case 0: GPU._palette.obj0[i] = [255,255,255,255]; break;
	    case 1: GPU._palette.obj0[i] = [192,192,192,255]; break;
	    case 2: GPU._palette.obj0[i] = [96,96,96,255]; break;
	    case 3: GPU._palette.obj0[i] = [0,0,0,255]; break;
	  }
	}
	break;

      // OBJ1 palette mapping
      case 9:
        for(var i=0;i<4;i++)
	{
	  switch((val>>(i*2))&3)
	  {
	    case 0: GPU._palette.obj1[i] = [255,255,255,255]; break;
	    case 1: GPU._palette.obj1[i] = [192,192,192,255]; break;
	    case 2: GPU._palette.obj1[i] = [96,96,96,255]; break;
	    case 3: GPU._palette.obj1[i] = [0,0,0,255]; break;
	  }
	}
	break;
    }
  }
};
