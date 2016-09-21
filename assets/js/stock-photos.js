(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var StockPhotosQuery = wp.media.model.Query.extend({

	/**
	 * Overrides wp.media.model.Query.sync
	 * Overrides Backbone.Collection.sync
	 * Overrides wp.media.model.Attachments.sync
	 *
	 * @param {String} method
	 * @param {Backbone.Model} model
	 * @param {Object} [options={}]
	 * @returns {Promise}
	 */
	sync: function( method, model, options ) {

		var args;

		// Overload the read method so Attachment.fetch() functions correctly.

		options = options || {};

		options.context = this;

		options.data = _.extend( options.data || {}, {
			action:  'wpaas_stock_photos_get'
		});

		// Clone the args so manipulation is non-destructive.
		args = _.clone( this.args );

		// Determine which page to query.
		if ( -1 !== args.posts_per_page ) {

			args.paged = Math.round( this.length / args.posts_per_page ) + 1;

		}

		options.data.query = args;

		return wp.media.ajax( options );

	}

},
{
	/**
	 * Overriding core behavior
	 */
	get: (function(){
		/**
		 * @static
		 * @type Array
		 */
		var queries = [];

		/**
		 * @returns {Query}
		 */
		return function( props, options ) {
			var Query    = StockPhotosQuery,
					args     = {},
					query,
					cache    = !! props.cache || _.isUndefined( props.cache );

			// Remove the `query` property. This isn't linked to a query,
			// this *is* the query.
			delete props.query;
			delete props.cache;

			// Generate the query `args` object.
			// Correct any differing property names.
			_.each( props, function( value, prop ) {

				if ( _.isNull( value ) ) {

					return;

				}

				args[ prop ] = value;

			});


			// Fill any other default query args.
			_.defaults( args, Query.defaultArgs );

			// Search the query cache for a matching query.
			if ( cache ) {

				query = _.find( queries, function( query ) {

					return _.isEqual( query.args, args );

				});

			} else {

				queries = [];

			}

			// Otherwise, create a new query and add it to the cache.
			if ( ! query ) {

				query = new Query( [], _.extend( options || {}, {
					props: props,
					args:  args
				} ) );

				queries.push( query );

			}

			return query;

		};
	}())
});

module.exports = StockPhotosQuery;

},{}],2:[function(require,module,exports){
/* global require */
var StockPhotosQuery = require( './stock-photos-query' );

var StockPhotos = wp.media.model.Attachments.extend({

	initialize: function( models, options ) {

		wp.media.model.Attachments.prototype.initialize.call( this, models, options );

		this.StockPhotosProps = new Backbone.Model();

		this.StockPhotosProps.set( 'importing', false );
		this.StockPhotosProps.set( 'previewing', false );

	},

	_requery: function( refresh ) {

		var props;

		if ( this.props.get('query') ) {

			props = this.props.toJSON();

			props.cache = ( true !== refresh );

			this.mirror( StockPhotosQuery.get( props ) );

		}

	}

});

module.exports = StockPhotos;

},{"./stock-photos-query":1}],3:[function(require,module,exports){
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

},{"./models/stock-photos.js":2,"./views/browser/stock-photos.js":6,"./views/preview/stock-photo.js":8}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
var StockPhotosFilter = wp.media.view.AttachmentFilters.extend({

	initialize: function() {

		var view = this;

		wp.media.view.AttachmentFilters.prototype.initialize.apply( this, arguments );

		this.StockPhotosProps = arguments[0].StockPhotosProps;

		this.listenTo( this.StockPhotosProps, 'change:importing', this.toggleState );

		this.toggleState();

		// No need to enqueue select2 again
		if ( ! _.isUndefined( wpaas_stock_photos.select2 ) ) {

			return;

		}

		/**
		 * Make sure we encapsulate select2
		 */
		var oldSelect2 = ! _.isUndefined( jQuery.fn.select2 ) ? jQuery.fn.select2 : null;

		jQuery( '<link/>', {
			rel: 'stylesheet',
			type: 'text/css',
			href: 'https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.0/css/select2.min.css'
		}).appendTo( 'head' );

		jQuery.ajax({
			url: 'https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.0/js/select2.min.js',
			dataType: 'script',
			success: function() {

				// Persistent accross instances
				wpaas_stock_photos.select2 = jQuery.fn.select2;

				// Now that we have our ref, put back the old one
				jQuery.fn.select2 = oldSelect2;

				view.addSelect2();

			},
			async: true
		});

	},

	createFilters: function() {

		this.filters = {};

		var t = this,
				priority = 10;

		_.each( wpaas_stock_photos.cat_choices, function( value, key ) {

			priority += 10;

			var filterKey = 'generic' === key ? 'all' : key;

			t.filters[ filterKey ] = {
				text: value,
				props: {
					category: key
				},
				priority: priority
			};

		} );

	},

	toggleState: function() {

		if ( this.StockPhotosProps.get( 'importing' ) ) {

			this.$el.prop( 'disabled', 'disabled' );

			return;

		}

		this.$el.removeProp( 'disabled' );

	},

	ready: function() {

		if ( ! _.isUndefined( wpaas_stock_photos.select2 ) && ! this.$el.data('select2') ) {

			this.addSelect2();

		}

	},

	addSelect2: function() {

		wpaas_stock_photos.select2.call( this.$el );

		var $el = this.$el,
				$select2 = $el.data('select2' );

		$select2.$container.addClass('wpaas-stock-photos');
		$select2.$dropdown.addClass('wpaas-stock-photos');

		$el.on('select2:open', function() {

			jQuery( document.body ).off( 'mousedown.select2.select2-' + $el.attr( 'id' ) );

			// Overriding the core select2 close function with our own instance of select2
			jQuery( document.body ).on( 'mousedown.select2.select2-' + $el.attr( 'id' ), function ( e ) {

				var $target = jQuery( e.target );

				var $select = $target.closest( '.select2' );

				var $all = jQuery( '.select2.select2-container--open' );

				$all.each( function () {

					if ( this == $select[ 0 ] ) {
						return;
					}

					wpaas_stock_photos.select2.call( $el, 'close' );

				});

			});

		});

	}

});

module.exports = StockPhotosFilter;

},{}],6:[function(require,module,exports){
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

},{"./stock-photo.js":4,"./stock-photos-filter.js":5}],7:[function(require,module,exports){
/* global wpaas_stock_photos */

var backBtn = wp.media.View.extend({

	tagName:   'h2',
	className: 'backBtn',

	events: {
		'click': 'goBack'
	},

	render: function() {

		this.$el.text( wpaas_stock_photos.back_btn );

		return this;

	},

	goBack: function() {

		this.unbind();
		this.remove();

		this.trigger( 'close' );

		if ( this.collection.StockPhotosProps.get( 'previewing' ) ) {

			this.collection.StockPhotosProps.set( 'previewing', false );

		}

	}

});

module.exports = backBtn;


},{}],8:[function(require,module,exports){
/* global require, wpaas_stock_photos */

var backBtnView = require( './back-btn.js' );

var StockPhotoPreview = wp.media.view.Frame.extend({

	tagName:   'div',
	className: 'wpaas-stock-photos stock-photo-preview',

	events: {
		'click a.license-details': 'showLicenseDetails'
	},

	initialize: function() {

		this.createToolbar();
		this.createAttachmentPreview();

	},

	createToolbar: function() {

		var toolbarOptions;

		toolbarOptions = {
			controller: this.controller
		};

		this.toolbar = new wp.media.view.Toolbar( toolbarOptions );

		this.views.add( this.toolbar );

		var backBtn = new backBtnView({
			controller: this,
			collection: this.collection,
			priority:   -80
		});

		// Make sure we remove every events on back
		this.listenToOnce( backBtn, 'close', this.close );

		// Let's put the actual category filter
		this.toolbar.set( 'backBtn', backBtn );

	},

	createAttachmentPreview: function() {

		this.attachmentPreview = new wp.media.View({
			controller: this.controller,
			tagName: 'div',
			className: 'stock-photo-image-preview'
		});

		this.attachmentPreview.$el.html(
				'<img src="' + this.model.get( 'sizes' ).preview.url + '">' +
				'<a href="#" class="license-details">' + wpaas_stock_photos.license_text + '</a>'
		);

		this.views.add( this.attachmentPreview );

	},

	showLicenseDetails: function( e ) {

		e.preventDefault();

		this.$el.find( 'a.license-details' ).replaceWith( '<p class="license-details">'  + wpaas_stock_photos.license_details + '</p>' );

	},

	close: function() {

		this.unbind();
		this.remove();

	}

});

module.exports = StockPhotoPreview;

},{"./back-btn.js":7}]},{},[3]);
