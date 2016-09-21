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
