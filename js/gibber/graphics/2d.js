(function() {
  var cnvs = null

  var TwoD = Gibber.Graphics.TwoD = {
    Canvas : function( column, noThree ) {
       var canvas = $( '<canvas>' )[0],
          ctx = canvas.getContext( '2d' ),
          GG = Gibber.Graphics,
          that = ctx,
          three = null;
          
      if( typeof noThree === 'undefined' ) noThree = false
      
      if( Gibber.Graphics.running ) Gibber.Graphics.clear()

      Gibber.Graphics.running = true

      if( cnvs !== null ) {
        cnvs.sprite.remove()
        try{
          Gibber.Graphics.scene.remove( cnvs.sprite )
        }catch(e){ console.log("CANNOT REMOVE SPRITE") }
      }

      if( Gibber.Graphics.canvas === null ) {
        Gibber.Graphics.init( '2d', column, noThree )
      }else if( Gibber.Graphics.mode === '3d' ) {
        Gibber.Graphics.use( '2d', null, noThree )
      }

      three = $( '#three' )
      three.show()
      canvas.width = three.width()
      canvas.height = three.height()
      
      that.top = 0 
      that.bottom = canvas.height
      that.left = 0
      that.right = canvas.width
      that.center = { x: canvas.width / 2, y : canvas.height / 2 }

      $( canvas ).css({ width: canvas.width, height: canvas.height })
      if( !Gibber.Graphics.noThree ) {
        var tex = new THREE.Texture( canvas )
      }else{
        three.empty()
        three.append( canvas )
      }
      $.extend( that, {
        canvas: canvas,
        texture: tex || { needsUpdate: function() {} }, 
        remove : function() {
          $( '#three' ).hide()
          //Gibber.Graphics.canvas = null
          //Gibber.Graphics.ctx = null 
          //cnvs = null
        },
        _fill : that.fill,
        _stroke : that.stroke,
        _rotate : that.rotate,
        rotate : function( amt ) {
          this.translate( this.center.x, this.center.y )
          this._rotate( amt )
          this.translate( -this.center.x, -this.center.y )  
        },
        fill : function( color ) {
          if( typeof color !== 'undefined' ) {
            if( ! isNaN( color ) ) {
              color = 'rgb(' + color + ',' + color + ',' + color + ')'
            }
            this.fillStyle = color
          }
          this._fill() 
          this.texture.needsUpdate = true
          return this
        },
        fade: function( amt, color ) {
          var store = this.alpha
          
          this.fillStyle = typeof color === 'undefined' ? 'black' : color
          this.alpha = amt
          this.fillRect( 0,0,this.width,this.height )
          this.alpha = store
        },
        stroke: function( color, lineWidth ) {
          if( typeof color !== 'undefined' ) {
            if( ! isNaN( color ) ) {
              color = 'rgb(' + color + ',' + color + ',' + color + ')'
            }
            this.strokeStyle = color
          }
          if( typeof lineWidth !== 'undefined' ) {
            this.lineWidth = lineWidth
          }
          this._stroke()
          this.texture.needsUpdate = true
          return this
        },
        _update: function() {
          this.save()
          for( var i = 0; i < this.graph.length; i++ ) {
            var shape = this.graph[ i ]
            shape._update()
            if( shape.update ) shape.update()
            shape.draw()
          }
          this.draw()
          this.restore()
        },
        update : function() {},
        draw : function() {},
        clear: function() {
          this.clearRect( 0,0,this.right,this.bottom )
          this.texture.needsUpdate = true
          return this
        },
        line : function( x1,y1, x2,y2 ) {
          this.beginPath()
            this.moveTo( x1, y1 )
            this.lineTo( x2, y2 )
          this.closePath()
          return this
        },
        circle : function( x,y,radius ) {
          if( radius > 0 ) {
            this.beginPath()
              this.arc( x, y, radius, 0, Math.PI * 2)
            this.closePath()
          }
          return this
        },
        square : function( x,y,size ) {
          this.beginPath()
            this.moveTo( x,y )
            this.lineTo( x + size, y )
            this.lineTo( x + size, y + size )
            this.lineTo( x, y + size )
            this.lineTo( x,y )
          this.closePath()
          return this
        },
        rectangle : function( x,y,width,height ) {
          this.beginPath()
            this.moveTo( x,y )
            this.lineTo( x + width, y )
            this.lineTo( x + width, y + height )
            this.lineTo( x, y + height )
            this.lineTo( x,y )
          this.closePath()
          return this
        },
        Square : function() {
          $.extend( this, {
            ctx: that,
            stroke: null,
            fill: 'gray',
            _update: function() {},
            draw: function() {
              that.square( this.x, this.y, this.size )
              if( this.stroke ) that.stroke( this.stroke )
              if( this.fill   ) that.fill( this.fill )
            },
            remove: function() {
              that.graph.splice( that.graph.indexOf( this ), 1 )
            },
            changeZ : function( v ) {
              z  = v
            }
          })
          var x = y = size = 200,
            z = that.graph.length;

          Object.defineProperties( this, {
            x: { 
              get: function() { return x },
              set: function(v) { that.clearRect( this.x, this.y, this.size, this.size ); x = v; }
            },
            y: { 
              get: function() { return y },
              set: function(v) { that.clearRect( this.x, this.y, this.size, this.size ); y = v; }
            },
            size: { 
              get: function() { return size },
              set: function(v) { that.clearRect( this.x, this.y, this.size, this.size ); sizex = v; }
            },
            z: { 
              get: function() { return z },
              set: function(v) { 
                that.reorderGraph() 
                that.graph.splice( that.graph.indexOf( this ),1 )
                that.graph.splice( v, 0, this )
                z = v
              }
            },
           
          })
          that.graph.push( this )
        },
        reorderGraph : function() {
          if( z > v ) {
             for( var i = v; i < that.graph.length; i++ ){ 
               that.graph[i].changeZ( that.graph[i].z + 1 )
             }
          }
        },
        graph : [],
        update: function() { this.texture.needsUpdate = true; return this },
        polygon: function( x,y,radius,sides ) {
          var ca  = 360 / sides
          
          for( var i = 1; i <= sides; i++ ) {
            var angle = ca * i,
                radians = Math.PI * 2 * ( angle / 360 ),
                _x = Math.round( Math.sin( radians ) * radius ) + x,
                _y = Math.round( Math.cos( radians ) * radius ) + y
            
            if( i === 1 ) {
              this.beginPath()
              this.moveTo( _x, _y )
            }else{
              this.lineTo( _x, _y )
            }
          }
          var angle = ca,
              radians = Math.PI * 2 * ( angle / 360 ),
              _x = Math.round( Math.sin( radians ) * radius ) + x,
              _y = Math.round( Math.cos( radians ) * radius ) + y   
          
          this.lineTo( _x, _y )
          this.closePath()
          return this
        },
        randomColor : function() {
          return "#" + Math.random().toString(16).slice(2, 8)
        },
        width:canvas.width,
        height:canvas.height,
        sprite : new THREE.Mesh(
          new THREE.PlaneGeometry( canvas.width, canvas.height, 1, 1),
          new THREE.MeshBasicMaterial({
            map:tex,
            affectedByDistance:false,
            useScreenCoordinates:true
          })
        ),
        hide: function() {
          Gibber.Graphics.scene.remove( that.sprite )
          Gibber.Graphics.graph.splice( that, 1 )
        },
        show : function() {
          Gibber.Graphics.scene.add( that.sprite )
          Gibber.Graphics.graph.push( that )
        }
      })

      that.texture.needsUpdate = true 

      that.sprite.position.x = that.sprite.position.y = that.sprite.position.z = 0
      
      if( !Gibber.Graphics.noThree ) {
        Gibber.Graphics.scene.add( that.sprite )
      }
      Gibber.Graphics.graph.push( that )
      
      cnvs = that

      Object.defineProperties( that, {
        fps: {
          get: function() { return Gibber.Graphics.fps !== null ? Gibber.Graphics.fps : 60 },
          set: function(v) { Gibber.Graphics.fps = v },
        },
        alpha: {
          get : function() { return this.globalAlpha },
          set : function(v) { this.globalAlpha = v }
        }
      })

      Gibber.Graphics.canvas2d = that

      return that
    }
  }

  window.Canvas = TwoD.Canvas

})()
