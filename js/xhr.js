q='XMLHTTP';XHR={o:function(u,d,h){/*@cc_on
@if(@_jscript_version>=5)
try{y=new ActiveXObject('Msxml2.'+q)}catch(e){try{y=new ActiveXObject('Microsoft.'+q)}
@else @*/{try{y=new XMLHttpRequest}//@end
catch(e){alert(q+' init failed')}}y.onreadystatechange=h;y.open('GET',u,1);y.setRequestHeader('Content-Type','application/x-www-form-urlencoded');e='';for(f in d)e+=(f+'='+d[f]+'&');y.send(e);return y},connect:function(u,p,c,a){t=this;this.x=XHR.o(u,p,function(){w=t.x;if(w&&w.readyState==4)w.status-200?c.fail(w,a):c.success(w,a)})}}
