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
