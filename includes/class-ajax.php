<?php

namespace WPaaS\StockPhotos;

if ( ! defined( 'ABSPATH' ) ) {

	exit;

}

final class Ajax {

	private $api = null;

	/**
	 * Ajax constructor.
	 *
	 * @param API $api
	 */
	public function __construct( API $api ) {

		$this->api = $api;

		add_action( 'wp_ajax_wpaas_stock_photos_get',      [ $this, 'get' ] );
		add_action( 'wp_ajax_wpaas_stock_photos_download', [ $this, 'download' ] );

	}

	public function get() {

		if ( ! current_user_can( 'upload_files' ) ) {

			wp_send_json_error();

		}

		$category = isset( $_POST['query']['category'] ) ? esc_attr( $_POST['query']['category'] ) : false;
		$page     = isset( $_POST['query']['paged'] ) ? absint( $_POST['query']['paged'] ) : 1;
		$per_page = isset( $_POST['query']['posts_per_page'] ) ? absint( $_POST['query']['posts_per_page'] ) : 40;

		if ( ! $category ) {

			wp_send_json_error();

		}

		$images = $this->api->get_images_by_cat( $category );

		if ( empty( $images ) ) {

			// We still want success here for the jQuery
			// deffered object to callback correctly
			wp_send_json_success( [] );

		}

		$total       = count( $images );
		$total_pages = ceil( $total / $per_page );
		$page        = max( $page, 1 );
		$page        = min( $page, $total_pages );
		$offset      = ( $page - 1 ) * $per_page;

		$images = array_splice( $images, $offset, $per_page );
		$images = array_map( [ $this, 'prepare_attachement_for_js' ], $images );
		$images = array_filter( $images );

		return  wp_send_json_success( $images );

	}

	/**
	 * Download an image given an url
	 */
	public function download() {

		if ( ! isset( $_POST['filename'], $_POST['id'], $_POST['nonce'] ) ) {

			wp_send_json_error();

		}

		$filename = sanitize_file_name( $_POST['filename'] );
		$id       = absint( $_POST['id'] );

		check_ajax_referer( 'wpaas_stock_photo_download_' . $id, 'nonce' );

		/**
		 * Resize to max 2400 px wide 80% quality
		 * Documentation: https://github.com/asilvas/node-image-steam
		 */
		$url = esc_url_raw( sprintf( '%s/%s/:/rs=w:2400/qt=q:80', \WPaaS\Plugin::config( 'imageApi.url' ), $filename ) );

		$import   = new Import();
		$image_id = $import->image( $url );

		if ( ! $image_id ) {

			wp_send_json_error();

		}

		$attachment = wp_prepare_attachment_for_js( $image_id );

		if ( ! $attachment ) {

			wp_send_json_error();

		}

		wp_send_json_success( $attachment );

	}

	/**
	 * Format attachement for bacbone use
	 *
	 * @param array $attachment
	 *
	 * @return mixed
	 */
	private function prepare_attachement_for_js( $attachment ) {

		$thumbnail = '';

		if ( empty( $attachment->fullsize ) ) {

			return false;

		}

		foreach ( [ 'comp', 'preview', 'thumb' ] as $key ) {

			if ( ! empty( $attachment->$key ) ) {

				$thumbnail = $attachment->$key;

				break;

			}

		}

		if ( empty( $thumbnail ) ) {

			return false;

		}

		return [
			'id'          => $attachment->photo_id,
			'title'       => wp_basename( $attachment->fullsize ),
			'filename'    => wp_basename( $attachment->fullsize ),
			'url'         => '',
			'link'        => '',
			'alt'         => '',
			'author'      => '',
			'description' => '',
			'caption'     => '',
			'name'        => '',
			'status'      => '',
			'uploadedTo'  => '',
			'date'        => '',
			'modified'    => '',
			'menuOrder'   => 0,
			'mime'        => '',
			'type'        => 'image',
			'subtype'     => '',
			'icon'        => '',
			'dateFormatted' => '',
			'nonces'      => [
				'download' => wp_create_nonce( 'wpaas_stock_photo_download_' . $attachment->photo_id )
			],
			'editLink'   => '',
			'meta'       => '',
			'authorName' => '',
			'sizes'      => [
				'thumbnail' => [
					'width'       => '',
					'height'      => '',
					'url'         => $thumbnail,
				],
				'preview' => [
					'width'       => '',
					'height'      => '',
					'url'         => $attachment->large,
				],
			]
		];

	}

}
