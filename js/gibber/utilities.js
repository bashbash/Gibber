(function() {
"use strict"

var soloGroup = [];
var isSoloing = false;

Gibber.Utilities = {
  random :  function() {
    var dict = {},
        lastChosen = null;
    
    for(var i = 0; i < arguments.length; i+=2) {
      dict[ "" + arguments[i] ] = { repeat: arguments[i+1], count: 0 };
    }

    this.pick = function() {
      var value = 0, index, lastValue;
      if(this[lastChosen]) lastValue = this[lastChosen]

      if(lastChosen !== null && dict[ lastValue ].count++ <= dict[ lastValue ].repeat) {
        index = lastChosen;
        if( dict[ lastValue ].count >= dict[ lastValue ].repeat) {
          dict[ lastValue ].count = 0;
          lastChosen = null;
        };
      }else{
        index = rndi(0, this.length - 1);
        value = this[index];
        if( typeof dict[ ""+value ] !== 'undefined' ) {
          dict[ ""+value ].count = 1;
          lastChosen = index;
        }else{
          lastChosen = null;
        }
      }
      
    	return index; // return index, not value as required by secondary notation stuff
    };
    
    return this;
  },
  
  choose: function( length ) {
    var output = null
    
    if( isNaN( length ) ) length = 1
    
    if( length !== 1 ) {
      var arr = []
    
      for( var i = 0; i < length; i++ ) {
        arr[ i ] = this[ rndi( 0, this.length - 1 ) ]
      }
      
      output = arr
    }else{
      output = this[ rndi( 0, this.length - 1 ) ]
    }
    
  	return output;
  },

  future : function(func, time) { 
    var __seq = new Gibberish.Sequencer({
      values:[
        function(){},
        function() {
          func();
          __seq.stop();
          __seq.disconnect();
        }
      ],
      durations:[ Gibber.Clock.time( time ) ]
    }).start()
    
    return function(){ __seq.stop(); __seq.disconnect(); }
  },
  
  shuffle : function( arr ) {
  		for(var j, x, i = arr.length; i; j = parseInt(Math.random() * i), x = arr[--i], arr[i] = arr[j], arr[j] = x);
  },
  
  solo : function( ugen ) {
    var args = Array.prototype.slice.call( arguments, 0 );
    if( ugen ) {
      if( isSoloing ) { Gibber.Utilities.solo(); } // quick toggle on / off
      
      // console.log( Master.inputs, args )
      for(var i = 0; i < Master.inputs.length; i++) {
        var idx = args.indexOf( Master.inputs[i].value )
        if( idx === -1) {
          soloGroup.push( [ Master.inputs[i].value, Master.inputs[i].value.amp ] );
          Master.inputs[i].value.amp = 0;
        }
      }
      isSoloing = true;
    }else{
      for( var i = 0; i < soloGroup.length; i++ ) {
        soloGroup[i][0].amp = soloGroup[i][1];
      }
      soloGroup.length = 0
      isSoloing = false;
    } 
  },
  fill : function( length, fnc ) {
    if( isNaN( length ) ) length = 16
    if( typeof fnc !== 'function' ) { fnc = Rndf() }
    
    fnc = fnc.bind( this 
    )
    for( var i = 0; i < length; i++ ) {
      this[ i ] = fnc()
    }
    
    return this
  },
}

window.solo = Gibber.Utilities.solo
window.future = Gibber.Utilities.future // TODO: fix global reference
Array.prototype.random = Array.prototype.rnd = Gibber.Utilities.random
Array.prototype.fill = Gibber.Utilities.fill
Array.prototype.choose = Gibber.Utilities.choose

})()
