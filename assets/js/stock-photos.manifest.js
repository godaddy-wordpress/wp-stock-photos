/* global require, wpaas_stock_photos */
var StockPhotosModel   = require( './models/stock-photos.js' ),
    StockPhotosBrowser = require( './views/browser/stock-photos.js' ),
    StockPhotoPreview  = require( './views/preview/stock-photo.js' );

/**
 * Overrides for wp.media
 */

/**
 * Make sure we override but keep the original bind handlers for select
 */
var coreBindHandlers = wp.media.view.MediaFrame.Select.prototype.bindHandlers;

wp.media.view.MediaFrame.Select.prototype.bindHandlers = function() {

	coreBindHandlers.apply( this, arguments );

	var previousView = false;

	this.on( 'content:render:wpaas_stock_photos', function() {

		var state       = this.state(),
		    collection  = state.get( 'wpaas_stock_photos' ),
		    toolbarMode = this.toolbar.mode(),
		    toggle;

		if ( _.isUndefined( collection ) ) {

			collection = new StockPhotosModel(
					null,
					{
						props: {
							query: true,
							category: 'generic'
						}
					}
			);

			// Reference the state if needed later
			state.set( 'wpaas_stock_photos', collection );

		}

		function toggleStockPhotosViews() {

			var model = collection.StockPhotosProps.get( 'previewing' );

			if ( model ) {

				this.content.set(
						new StockPhotoPreview({
							controller: this,
							collection: collection,
							model:      model
						})
				);

				this.$el.removeClass( 'hide-toolbar' );

				// Trigger our custom toolbar mode
				this.toolbar.mode( 'wpaas-stock-photos-preview' );

				return;

			}

			this.$el.addClass( 'hide-toolbar' );

			this.content.set( new StockPhotosBrowser({
				controller: this,
				collection: collection
			}) );

			this.toolbar.mode( toolbarMode );

		}

		toggle = _.bind( toggleStockPhotosViews, this );

		// Only listen once
		// @todo figure out how to use state machine to handle preview state
		if ( ! previousView ) {

			this.listenTo( collection.StockPhotosProps, 'change:previewing', toggle );

		}

		previousView = true;

		toggle();

	}, this );

	this.on( 'toolbar:create:wpaas-stock-photos-preview', this.createToolbar, this );
	this.on( 'toolbar:render:wpaas-stock-photos-preview', function( view ) {

		var controller = this;

		view.set( 'import', {
			text:     wpaas_stock_photos.import_btn,
			style:    'primary',
			priority: 80,

			click: function() {

				var state = controller.state(),
				    props = state.get( 'wpaas_stock_photos' ).StockPhotosProps;

				props.set( 'importing', props.get( 'previewing' ).get( 'id' ) );
				props.set( 'previewing', false );

			}
		});

	}, this );

	var coreSelectOptions = false;

	this.on( 'toolbar:render:select', function( toolbar ) {

		if ( ! coreSelectOptions ) {

			coreSelectOptions = _.extend( {
				style: 'primary',
				text: toolbar.options.text
			}, toolbar.options.items.select );

			return;

		}

		// Bring back the default select toolbar
		toolbar.set( 'select', _.clone( coreSelectOptions ) );

	}, this );

};

/**
 * Override media with our custom menu router
 *
 * @param @param {wp.media.view.Router} routerView
 */
var coreBrowseRouter = wp.media.view.MediaFrame.Select.prototype.browseRouter;

wp.media.view.MediaFrame.Select.prototype.browseRouter = function( routerView ) {

	coreBrowseRouter.apply( this, arguments );

	routerView.set({
		wpaas_stock_photos: {
			text:     wpaas_stock_photos.menu_title,
			priority: 30
		}
	});

};

/**
 * Override library collection uploading to add frame switch context
 */
var coreLibraryUploading = wp.media.controller.Library.prototype.uploading;

wp.media.controller.Library.prototype.uploading = function() {

	if ( 'wpaas_stock_photos' === this.frame.content.mode() ) {

		this.frame.content.mode( 'browse' );

	}

	coreLibraryUploading.apply( this, arguments );

};
