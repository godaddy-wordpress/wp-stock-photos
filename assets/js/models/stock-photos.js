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
