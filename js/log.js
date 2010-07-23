LOG = {
  _start: 0,

  reset: function() {
    d=new Date(); LOG._start=d.getTime();
  },

  out: function(module, str) {
    t=new Date(); ts=t.getTime()-LOG._start;
    //console.log('{'+ts+'ms} ['+module+'] '+str);
    document.getElementById('msg').innerHTML += ('{'+ts+'ms} ['+module+'] '+str+'<br>');
  }
};
