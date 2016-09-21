/* global require */

var StockPhotosFilter = require( './stock-photos-filter.js' ),
    StockPhotoThumb   = require( './stock-photo.js' );

var StockPhotosBrowser = wp.media.view.Frame.extend({

	tagName:   'div',
	className: 'wpaas-stock-photos attachments-browser',

	initialize: function() {

		this.createToolbar();
		this.createAttachments();
		this.updateContent();

		this.listenTo( this.collection, 'add remove reset', _.bind( this.updateContent, this ) );

	},

	createToolbar: function() {

		var toolbarOptions;

		toolbarOptions = {
			controller: this.controller
		};

		this.toolbar = new wp.media.view.Toolbar( toolbarOptions );

		this.views.add( this.toolbar );

		// This is required to prevent a js warning
		this.toolbar.set( 'spinner', new wp.media.view.Spinner({
			priority: -60
		}) );

		// "Filters" will return a <select>, need to render
		// screen reader text before
		this.toolbar.set( 'filtersLabel', new wp.media.view.Label({
			value: wpaas_stock_photos.filter_label,
			attributes: {
				'for':  'media-attachment-filters'
			},
			priority:   -80
		}).render() );

		// Let's put the actual category filter
		this.toolbar.set( 'filters', new StockPhotosFilter({
			controller:       this.controller,
			model:            this.collection.props,
			StockPhotosProps: this.collection.StockPhotosProps,
			priority:         -80
		}).render() );

	},

	createAttachments: function() {

		this.attachments = new wp.media.view.Attachments({
			controller:     this.controller,
			collection:     this.collection,
			AttachmentView: StockPhotoThumb
		});

		this.views.add( this.attachments );

		this.attachmentsNoResults = new wp.media.View({
			controller: this.controller,
			tagName: 'div',
			className: 'uploader-inline'
		});

		this.attachmentsNoResults.$el.addClass( 'hidden' );
		this.attachmentsNoResults.$el.html(
				'<div class="uploader-inline-content has-upload-message">' +
				'<h2 class="upload-message">'+
				wpaas_stock_photos.no_images +
				'</h2></div>'
		);

		this.views.add( this.attachmentsNoResults );

	},

	updateContent: function() {

		var view = this;

		this.toolbar.get( 'spinner' ).show();

		if ( this.collection.length ) {

			view.attachmentsNoResults.$el.addClass( 'hidden' );

			view.toolbar.get( 'spinner' ).hide();

			return;

		}

		this.collection.more().always( function() {

			if ( ! view.collection.length ) {

				view.attachmentsNoResults.$el.removeClass( 'hidden' );

			} else {

				view.attachmentsNoResults.$el.addClass( 'hidden' );

			}

			view.toolbar.get( 'spinner' ).hide();

		} );

	}

});

module.exports = StockPhotosBrowser;
