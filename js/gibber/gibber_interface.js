( function() {
   
  $script( 'external/autogui' , function() {
    Gibber.interfaceIsReady()
  } )

  var mappingProperties = {
    value: {
      min: 0, max: 1,
      output: Gibber.LINEAR,
      wrap: false,       
      timescale: 'interface',
    },
  },
  remoteCount = 0
  
  var I = Gibber.Environment.Interface = {
    mode : 'local',
    client: 0,
    panel : null,
    socket : null,
    callbacks : {},
    
    newPanel : function( column ) {
      if( typeof column === 'undefined' ) {
        if( Gibber.isInstrument ) {
          column = {
            bodyElement: $('body')
          }
        }else{
          column = Layout.addColumn()
        }
      }
      
      var panel = new Interface.Panel({ container: column.bodyElement, useRelativeSizesAndPositions:true, font:'normal 20px Helvetica' })
      
      $( panel.canvas ).css({
        position: 'relative',
        width: $( column.bodyElement ).width(),
        height: $( column.bodyElement ).height()
      })
      
      this.panel = panel
      
      return panel
    },
    
    initializers : {
      XY : function( widget, props ) {
        var mappingProperties = {
          x : { min:0, max:1, output:Gibber.LINEAR, wrap:false, timescale:'interface' },
          y : { min:0, max:1, output:Gibber.LINEAR, wrap:false, timescale:'interface' }
        }
        for( var i = 0; i < widget.values.length; i++ ) {
          ( function() { 
            var num = i,
                child = widget.values[ num ],
                x = 0, y = 0
            
            Object.defineProperties( child, {
              x: {
                get: function() { return x },
                set: function(v) { x = v; }
              },
              y : {
                get: function() { return y },
                set: function(v) { y = v; }
              }
            })

            Gibber.createProxyProperties( child, mappingProperties, false )
            widget[ num ] = child
          })()
        }
      },
      Piano : function( widget, props ) {
        var target = widget.target
        Object.defineProperty( widget, 'target', {
          get: function() { return target },
          set: function(v) { 
            target = v
            for( var i = 0; i < widget.children.length; i++ ) {
              widget.children[ i ].target = target
              widget.children[ i ].key = typeof target.note !== 'undefined' ? 'note' : 'frequency'
              
              widget.children[ i ].sendTargetMessage = function() {
                this.target.note( this.frequency, this.value )
              }
            }
          
          }
        })
        
        widget.onboundschange = function() { 
          if( this._initialized) this.placeKeys()
          this.target = this.target // triggers reassignment of key
        }
      },
    },
    defaults: {
      XY : {
        //detectsCollision:false,
        childWidth:40,
        //friction:0,
        fill:'rgba(255,255,255,.1)',
        stroke:'#aaa',
        numChildren:2,
        usePhysics:false
      },
      Piano: {
         startletter : "C",
         startoctave : 3,
         endletter : "C",
         endoctave : 4,
         //bounds:[0,0,1,.25],
         background:'white',
         fill: 'black'
      }
    },
    
    widget: function( props, name ) {
      if( this.mode === 'local' ) {
        if( I.panel === null) {
          I.newPanel()
        }
      
        if( typeof props === 'undefined' ) {
          props = {
            mode:'toggle'
          }
        }
        
        if( I.defaults[ name ] ) props = $.extend( I.defaults[name], props )
        
        var w = new Interface[ name ]( props )
        w.type = 'mapping'

        if( typeof w.bounds[0] === 'undefined' ) {
          I.autogui.placeWidget( w, false )
        }
        
        Gibber.Environment.Interface.panel.add( w )

        if( I.initializers[ name ] ){
          I.initializers[ name ]( w, props )
        }else{
          var prop = 'value',
              property = mappingProperties[ prop ],
              mapping = $.extend( {}, property, {
                Name  : prop.charAt(0).toUpperCase() + prop.slice(1),
                name  : prop,
                type  : 'mapping',
                value : 1,
                object: w,
                targets:[],
              })
              //oldSetter = b.__lookupSetter__( prop )
      
          Object.defineProperty( mapping.object, mapping.Name, {
            get: function() { return mapping },
            set: function(v) {
              if( typeof v === 'object' && v.type === 'mapping' ) {
                Gibber.createMappingObject( mapping, v )
              }
            }
          })
      
          w.mappingObjects = [ mapping ]
          w.mappingProperties = mappingProperties
      
          w.replaceWith = function( replacement ) {
            if( w.target ) replacement.target = w.target
            if( w.key )    replacement.key    = w.key
        
            I.panel.remove( w )
            I.panel.add( replacement )
        
            replacement.setValue( w.value )
        
            for( var i = 0; i < this.mappingObjects.length; i++ ) {
              var mapping = this.mappingObjects[ i ]
          
              if( mapping.targets.length > 0 ) {
                for( var j = 0; j < mapping.targets.length; j++ ) {
                  var _mapping = mapping.targets[ j ]
            
                  if( replacement.mappingProperties[ mapping.name ] ) {
                    _mapping[ 0 ].mapping.replace( replacement, mapping.name, mapping.Name )
                  }else{ // replacement object does not have property that was assigned to mapping
                    _mapping[ 0 ].mapping.remove()
                  }
                }
              }
            }
          }
        }
      
        w.kill = w.remove = function() {
          w.panel.remove( w )
        }
      
        Object.defineProperty( w, '_', {
          get: function() { w.kill() },
          set: function(v) { }
        })
            
        return w
      }else{
        props = props || {}
        
        var w = { 
          value: 0,
          type: 'mapping',
          min:0, max:1,
          client: this.client,
          remoteID: '/' + ( props.name || remoteCount++ ),
          setValue: function( val ) {
            this.value = val
            var msg = {
              address: '/clients/' + this.client + this.remoteID,
              parameters:[ val ] 
            }
            I.socket.send( JSON.stringify( msg ) )
          },
          kill: function() { 
            var msg = {
              address: '/clients/' + this.client + '/interface/removeWidget',
              parameters:[ w.remoteID ] ,
            }
            I.socket.send( JSON.stringify( msg ) )
          },
          replaceWith: function() {
            this.kill()
          }
        }
      
        var prop = 'value',
            property = mappingProperties[ prop ],
            mapping = $.extend( {}, property );
            
            $.extend( mapping, {
              Name  : prop.charAt(0).toUpperCase() + prop.slice(1),
              name  : prop,
              type  : 'mapping',
              value : 1,
              object: w,
              targets:[],
            })
            
        Object.defineProperty( mapping.object, mapping.Name, {
          get: function() { return mapping },
          set: function(v) {
            if( typeof v === 'object' && v.type === 'mapping' ) {
              Gibber.createMappingObject( mapping, v )
            }
          }
        })
        
        var label = ''
        Object.defineProperty( w, 'label', {
          get: function() { return label },
          set: function(v) {
            label = v
            var msg = {
              address: '/clients/' + this.client + '/interface/setLabel',
              parameters:[ w.remoteID, label ] ,
            }
            I.socket.send( JSON.stringify( msg ) )
          }
        })
        
        w.mappingObjects = [ mapping ]
        w.mappingProperties = mappingProperties
        
        this.callbacks[ w.remoteID ] = function( data ) {
          w.value = data.parameters[0]
          if( w.onvaluechange )
            w.onvaluechange()
        }
        
        var msg = {
          address: '/clients/' + this.client + '/interface/addWidget',
          parameters:[
          {
            type:name,
            target:'OSC', key: w.remoteID, 
            name: w.remoteID,
          }] 
        }
        //console.log( "sending widget", msg ) 
        this.socket.send( JSON.stringify( msg ) )
        
        return w
      }
    },
    use : function( mode, client ) {
      if( mode === 'remote' ) {
        if( I.socket === null || I.socket.readyState === 3 ) {
          var msg = JSON.stringify({ address:'/createLivecodeServer', parameters:[] }),
              _socket = I.socket = new WebSocket( 'ws://127.0.0.1:10001' )
          
          I.socket.onopen = function() {
            _socket.send( msg )
          }
          I.socket.onmessage = function(msg) {
            var data
            try{
              data = JSON.parse( msg.data )
            }catch( error ) {
              console.error( "ERROR on parsing JSON", error )
              return
            }
            if( I.callbacks[ data.address ] ) {
              I.callbacks[ data.address ]( data )
            }
          }
          window.OSC = Gibber.Environment.Interface.socket
          window.OSC.callbacks = Gibber.Environment.Interface.callbacks
          
        }
        I.mode = 'remote'
        I.client = client
      }else{
        I.mode = 'local'
      }
    },
    
    clear : function( num ) {
      var addr = isNaN( num ) ? I.client : num
      
      if( num === '*') addr = '*'
      
      if( I.mode === 'remote' ) {
        var msg = {
          address: '/clients/' + addr + '/interface/clear',
          parameters:[] 
        }
        
        I.socket.send( JSON.stringify( msg ) )
      }
    },
    button: function( props ) { return I.widget( props, 'Button' ) },
    slider: function( props ) { return I.widget( props, 'Slider' ) },
    knob: function( props )   { return I.widget( props, 'Knob' ) },
    xy: function( props )     { return I.widget( props, 'XY' ) },        
    piano: function( props )  { return I.widget( props, 'Piano' ) },    
  }
  
  Interface.use = Gibber.Environment.Interface.use
  Interface.clear = Gibber.Environment.Interface.clear

  window.Button   = Gibber.Environment.Interface.button
  window.Slider   = Gibber.Environment.Interface.slider
  window.Knob     = Gibber.Environment.Interface.knob
  window.XY       = Gibber.Environment.Interface.xy
  window.Keyboard = Gibber.Environment.Interface.piano
  
  var OSC = Gibber.OSC = {
    callbacks : {},
    init : function( port ) {
      var _port = port || 10080,
          _socket = OSC.socket = new WebSocket( 'ws://127.0.0.1:' + _port )
      
      OSC.socket.onopen = function() { console.log( "OPENED" ) }
      OSC.socket.onmessage = OSC.onmessage;
    },
    onmessage : function(msg) {
      var data
      try{
        data = JSON.parse( msg.data )
      }catch( error ) {
        console.error( "ERROR on parsing JSON", error )
        return
      }
      if( OSC.callbacks[ data.path ] ) {
        OSC.callbacks[ data.path ]( data.params )
      }else{
        if( OSC.callbacks[ '*' ] ) {
          data.params.address = data.path 
          OSC.callbacks[ '*' ]( data.params )
        }
      }
    },
    
    send : function( address, typetags, params ) {
      var msg = {
        'address':address,
        'typetags':typetags,
        'params':params
      }
      OSC.socket.send( JSON.stringify( msg ) )
    },
  }
  window.OSC = OSC
})()
