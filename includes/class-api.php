<?php

namespace WPaaS\StockPhotos;
use WPaaS\Plugin as WPaaS;

if ( ! defined( 'ABSPATH' ) ) {

	exit;

}

/**
 * Class API
 *
 * Handle fetching of image based on category from the D3 api
 */
final class API {

	/**
	 * Constant used to interact with the D3 API
	 */
	const IMAGE_ENPOINT = '';
	const CAT_ENPOINT   = '';

	private $image_cat_url;
	private $category_api_url;

	/**
	 * Hold transient base namespace
	 *
	 * @const string
	 */
	const TRANSIENT_BASE                  = '';
	const TRANSIENT_KEY_FOR_D3_CATEGORIES = '';

	/**
	 * Image_API constructor.
	 */
	public function __construct() {

		$this->image_cat_url    = static::IMAGE_ENPOINT . 'category/%s/';
		$this->category_api_url = static::CAT_ENPOINT;

	}

	/**
	 * Retrieve json response from one category and store it as a transient for later use
	 *
	 * @param string $cat
	 * @return object array of objects
	 */
	public function get_images_by_cat( $cat ) {

		if ( false === ( $category = $this->get_api_cat( $cat ) ) ) {

			return [];

		}

		// Check if we have a transient cached response for that call
		if ( $data = get_transient( static::TRANSIENT_BASE . $category ) ) {

			return $data;

		}

		if ( false === ( $data = $this->fetch_images( $category ) ) ) {

			return [];

		}

		shuffle( $data );

		set_transient( static::TRANSIENT_BASE . $category, $data, HOUR_IN_SECONDS );

		return $data;

	}

	public function get_d3_choices() {

		$categories = $this->get_d3_categories();

		if ( ! $categories ) {

			return [];

		}

		/* uncomment this if we ever want to filter out "top level categories"

		// to help ensure the user chooses the most relevant category to their business,
		// let's not include "top level categories"
		$categories = array_filter( $categories, function( $category ) {

			return count( $category['parents'] ) > 0;

		} );
		*/

		uasort( $categories, function( $a, $b ) {

			$pop_a = $a['popularity'];
			$pop_b = $b['popularity'];

			return ( $pop_a === $pop_b ) ? 0 : ( $pop_a > $pop_b ? -1 : 1 );

		} );

		$categories = wp_list_pluck( $categories, 'display_name' );
		$popular    = array_slice( $categories, 0, 50 );
		$others     = array_slice( $categories, 50 );

		natcasesort( $others );

		// Prepend an empty choice for Select2
		return [ '' => '' ] + $popular + $others;

	}



	/**
	 * Get and cache D3 categories from their API endpoint
	 * see https://d3.godaddy.com/api/v1/categories/
	 *
	 * @return false if api error, otherwise assoc array of category object's "str_id" => category object
	 */
	public function get_d3_categories() {

		// Check if we have a transient cached response for that call
		if ( $data = get_transient( static::TRANSIENT_KEY_FOR_D3_CATEGORIES ) ) {

			return $data;

		}

		if ( $data = $this->fetch_d3_categories() ) {

			// can use slower cache expiry since the category api endpoint is updated very infrequently
			set_transient( static::TRANSIENT_KEY_FOR_D3_CATEGORIES, $data, DAY_IN_SECONDS );

		}

		return $data;

	}

	public function get_d3_categories_fallback() {

		$list = [
			'professional'                 => __( 'Business / Finance / Law', 'stock-photos' ),
			'graphicdesign'                => __( 'Design / Art / Portfolio', 'stock-photos' ),
			'education'                    => __( 'Education', 'stock-photos' ),
			'health'                       => __( 'Health / Beauty', 'stock-photos' ),
			'constructionservices'         => __( 'Home Services / Construction', 'stock-photos' ),
			'massmedia'                    => __( 'Music / Movies / Entertainment', 'stock-photos' ),
			'non-charitableorganizations'  => __( 'Non-profit / Causes / Religious', 'stock-photos' ),
			'generic'                      => __( 'Other', 'stock-photos' ),
			'pets'                         => __( 'Pets / Animals', 'stock-photos' ),
			'realestate'                   => __( 'Real Estate', 'stock-photos' ),
			'restaurants'                  => __( 'Restaurant / Food', 'stock-photos' ),
			'active'                       => __( 'Sports / Recreation', 'stock-photos' ),
			'auto'                         => __( 'Transportation / Automotive', 'stock-photos' ),
			'hotelstravel'                 => __( 'Travel / Hospitality / Leisure', 'stock-photos' ),
			'weddingphotographers'         => __( 'Wedding', 'stock-photos' ),
		];

		return $list;

	}

	/**
	 * Helper to fetch categories from the API
	 *
	 * As an implementation detail, does some post processing of the raw API json response
	 *
	 * @return false if api error, otherwise assoc array of category object's "str_id" => category object
	 */
	private function fetch_d3_categories() {

		$data = $this->fetch( $this->category_api_url );

		if ( ! is_array( $data ) ) {

			return $data;

		}

		$output = [];

		foreach ( $data as $i => $cat ) {

			$output[ $cat->str_id ] = [
				'display_name' => $cat->display_name,
				'popularity'   => $cat->popularity,
			];

		}

		return $output;

	}

	/**
	 * Check if the current locale can use d3.
	 *
	 * @return bool
	 */
	public function is_d3_locale() {

		return in_array( get_locale(), [ 'en_US', 'en_CA' ] );

	}

	/**
	 * Get api category slug
	 *
	 * @param string $slug
	 *
	 * @return bool|string
	 */
	private function get_api_cat( $slug ) {

		$d3_categories = $this->get_d3_categories();

		if ( ! $d3_categories && array_key_exists( $slug, $this->get_d3_categories_fallback() ) ) {

			return $slug;

		}

		$d3_categories['generic'] = true;

		return isset( $d3_categories[ $slug ] ) ? $slug : false;

	}

	/**
	 * Helper to fetch infomation from the api
	 *
	 * @param string $url
	 * @return array|bool|mixed|object
	 */
	private function fetch( $url ) {

		$response = wp_remote_get( $url );

		if ( is_wp_error( $response ) ) {

			return false;

		}

		return json_decode( wp_remote_retrieve_body( $response ) );

	}

	/**
	 * Helper function to fetch stock images from the API.
	 *
	 * When the given category has no stock photos, this function will be
	 * responsible for fetching the parent category's stock photo as a fallback.
	 *
	 * @param string $category a valid "str_id" slug from the category API
	 *
	 * @return false if api error, otherwise array of objects from the api
	 */
	private function fetch_images( $category ) {

		$json = $this->fetch( sprintf( $this->image_cat_url, $category ) );

		if ( false === $json ) {

			return false;

		}

		if ( $json->count > 0 ) {

			return $json->results;

		}

		if ( empty( $json->parent_category ) ) {

			return [];

		}

		return $this->fetch_images( $json->parent_category );

	}

}
