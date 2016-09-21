<?php

namespace WPaaS\StockPhotos;

if ( ! defined( 'ABSPATH' ) ) {

	exit;

}

final class Scripts {

	private $api;

	public function __construct( API $api ) {

		$this->api = $api;

		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_scripts' ], PHP_INT_MAX );
		add_action( 'wp_enqueue_scripts',    [ $this, 'enqueue_scripts' ], PHP_INT_MAX );
	}

	public function enqueue_scripts() {

		/**
		 * No need to enqueue stock photo is media-views dependency is not there
		 */
		if ( ! wp_script_is( 'media-views', 'enqueued' ) ) {

			if ( ! is_customize_preview() ) {

				return;

			}

		}

		$suffix = SCRIPT_DEBUG ? '' : '.min';

		wp_enqueue_script( 'wpaas-stock-photos', plugins_url( "assets/js/stock-photos{$suffix}.js", Plugin::FILE ), [ 'media-views' ], '0.1.0', true );
		wp_enqueue_style( 'wpaas-stock-photos', plugins_url( "assets/css/stock-photos{$suffix}.css", Plugin::FILE ), [ 'media-views' ], '0.1.0' );

		$choices = $this->api->get_d3_choices();

		if ( ! $this->api->is_d3_locale() || ! $choices ) {

			$choices = $this->api->get_d3_categories_fallback();

		}

		array_shift( $choices );

		$choices = [ 'generic' => __( 'Generic', 'stock-photos' ) ] + $choices;

		$reseller_id = -1;

		if ( is_callable( [ '\WPaaS\Plugin', 'reseller_id' ] ) ) {

			$reseller_id = \WPaaS\Plugin::reseller_id();

		}

		switch ( $reseller_id ) {

			case 1 :

				$license_details = sprintf(
					__( 'Images available and licensed for use are intended for GoDaddy hosted customers only and are subject to the terms and conditions of third-party intellectual property rights. <a href="%s" target="_blank">See Terms and Conditions</a> for additional details.', 'stock-photos' ),
					'https://www.godaddy.com/agreements/showdoc.aspx?pageid=Hosting_SA'
				);

				break;

			default :

				$license_details = sprintf(
					__( 'Images available and licensed for use are intended for our hosted customers only and are subject to the terms and conditions of third-party intellectual property rights. <a href="%s" target="_blank">See Terms and Conditions</a> for additional details.', 'stock-photos' ),
					esc_url(
						sprintf(
							'https://www.secureserver.net/agreements/showdoc.aspx?pageid=Hosting_SA&prog_id=%d',
							$reseller_id
						)
					)
				);

		}

		wp_localize_script(
			'wpaas-stock-photos',
			'wpaas_stock_photos',
			[
				'menu_title'      => __( 'Stock Photos', 'stock-photos' ),
				'filter_label'    => __( 'Change category', 'stock-photos' ),
				'cat_choices'     => $choices,
				'no_images'       => __( 'No stock photos found.', 'stock-photos' ),
				'preview_btn'     => __( 'Preview', 'stock-photos' ),
				'import_btn'      => __( 'Import', 'stock-photos' ),
				'back_btn'        => __( 'Back', 'stock-photos' ),
				'license_text'    => __( 'About Image Licenses', 'stock-photos' ),
				'license_details' => $license_details,
			]
		);

	}

}
