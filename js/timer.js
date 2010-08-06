TIMER = {
  _div: 0,
  _tma: 0,
  _tima: 0,
  _tac: 0,

  _clock: {main:0, sub:0, div:0},

  reset: function() {
    TIMER._div = 0;
    TIMER._sdiv = 0;
    TIMER._tma = 0;
    TIMER._tima = 0;
    TIMER._tac = 0;
    TIMER._clock.main = 0;
    TIMER._clock.sub = 0;
    TIMER._clock.div = 0;
    LOG.out('TIMER', 'Reset.');
  },

  step: function() {
    TIMER._tima++;
    TIMER._clock.main = 0;
    if(TIMER._tima > 255)
    {
      TIMER._tima = TIMER._tma;
      MMU._if |= 4;
    }
  },

  inc: function() {
    var oldclk = TIMER._clock.main;

    TIMER._clock.sub += Z80._r.m;
    if(TIMER._clock.sub > 3)
    {
      TIMER._clock.main++;
      TIMER._clock.sub -= 4;

      TIMER._clock.div++;
      if(TIMER._clock.div==16)
      {
        TIMER._clock.div = 0;
	TIMER._div++;
	TIMER._div &= 255;
      }
    }

    if(TIMER._tac & 4)
    {
      switch(TIMER._tac & 3)
      {
        case 0:
	  if(TIMER._clock.main >= 64) TIMER.step();
	  break;
	case 1:
	  if(TIMER._clock.main >=  1) TIMER.step();
	  break;
	case 2:
	  if(TIMER._clock.main >=  4) TIMER.step();
	  break;
	case 3:
	  if(TIMER._clock.main >= 16) TIMER.step();
	  break;
      }
    }
  },

  rb: function(addr) {
    switch(addr)
    {
      case 0xFF04: return TIMER._div;
      case 0xFF05: return TIMER._tima;
      case 0xFF06: return TIMER._tma;
      case 0xFF07: return TIMER._tac;
    }
  },

  wb: function(addr, val) {
    switch(addr)
    {
      case 0xFF04: TIMER._div = 0; break;
      case 0xFF05: TIMER._tima = val; break;
      case 0xFF06: TIMER._tma = val; break;
      case 0xFF07: TIMER._tac = val&7; break;
    }
  }
};
