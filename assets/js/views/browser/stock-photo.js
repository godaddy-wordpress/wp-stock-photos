/* global module, wpaas_stock_photos */

var StockPhotoThumb = wp.media.view.Attachment.extend({

	events: {
		'click': 'previewImage'
	},

	initialize: function() {

		wp.media.view.Attachment.prototype.initialize.apply( this, arguments );

		this.listenTo( this.collection.StockPhotosProps, 'change:importing', this.toggleState );

	},

	render: function() {

		wp.media.view.Attachment.prototype.render.apply( this, arguments );

		var $template = jQuery( this.$el.wrapAll( '<div>' ).parent().html() );

		// Add some html to the template
		$template.find( '.thumbnail' ).before(
				'<span class="import">' + wpaas_stock_photos.preview_btn + '</span>' +
				'<span class="spinner"></span>'
		);

		this.toggleState();

		this.$el.html( $template.html() );

		return this;

	},

	previewImage: function( event ) {

		event.preventDefault();

		this.collection.StockPhotosProps.set( 'previewing', this.model );

	},

	downloadImage: function() {

		var t = this;

		wp.media.ajax({
			data: {
				action:   'wpaas_stock_photos_download',
				filename: this.model.get( 'filename' ),
				id:       this.model.get( 'id' ),
				nonce:    this.model.get( 'nonces' ).download
			}
		}).done( function( attachment ) {

			var browse = wp.media.frame.content.mode( 'browse' );

			browse.get( 'gallery' ).collection.add( attachment );
			browse.get( 'selection' ).collection.add( attachment );

			// This will trigger all mutation observer
			wp.Uploader.queue.add( attachment );
			wp.Uploader.queue.remove( attachment );

			// @todo find a better way
			browse.get( 'gallery' ).$( 'li:first .thumbnail' ).click();

		}).fail( function() {

			// @todo

		}).always( function() {

			t.collection.StockPhotosProps.set( 'importing', false );
			t.toggleState();
			t.$el.blur();

		});

	},

	toggleState: function() {

		var import_id = this.collection.StockPhotosProps.get( 'importing' );

		if ( import_id ) {

			if ( this.model.get('id') === import_id ) {

				this.$el.addClass( 'importing' );

				this.downloadImage( import_id );

			}

			this.$el.addClass( 'inactive' );

			return;

		}

		this.$el.removeClass( 'inactive importing' );

	}

});

module.exports = StockPhotoThumb;
