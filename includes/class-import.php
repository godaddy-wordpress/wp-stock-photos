<?php

namespace WPaaS\StockPhotos;

if ( ! defined( 'ABSPATH' ) ) {

	exit;

}

final class Import {

	/**
	 * Import image from an url
	 *
	 * @param $url
	 *
	 * @return bool|int|object
	 */
	public function image( $url ) {

		$file_array = [];

		// Download file to temp location
		$file_array['tmp_name'] = $this->download( $url );

		if ( ! $file_array['tmp_name'] ) {

			return false;

		}

		preg_match( '/[^\?]+\.(jpe?g|jpe|gif|png)\b/i', $file_array['tmp_name'], $matches );

		if ( ! $matches ) {

			unlink( $file_array['tmp_name'] );

			return false;

		}

		$file_array['name'] = basename( $matches[0] );

		if ( ! function_exists( 'media_handle_sideload' ) ) {

			require_once ABSPATH . 'wp-admin/includes/media.php';

		}

		// Do the validation and storage stuff
		$id = media_handle_sideload( $file_array, 0 );

		$this->delete_file( $file_array['tmp_name'] );

		return is_wp_error( $id ) ? false : $id;

	}

	/**
	 * Download a file by its URL
	 *
	 * @param  string $url
	 *
	 * @return bool|string
	 */
	private function download( $url ) {

		if ( ! function_exists( 'download_url' ) ) {

			require_once ABSPATH . 'wp-admin/includes/file.php';

		}

		$file = download_url( $url );

		if ( is_wp_error( $file ) ) {

			return false;

		}

		// Added functionality to deal with image without extension
		$tmp_ext  = pathinfo( $file, PATHINFO_EXTENSION );

		// Get the real image extension
		$file_ext = image_type_to_extension( exif_imagetype( $file ) );

		// Replace extension of basename file
		$new_file = basename( $file, ".$tmp_ext" ) . $file_ext;

		// Replace old file with new file in complete path location
		$new_file = str_replace( basename( $file ), $new_file, $file );

		// Rename from .tpm to actual file format
		rename( $file, $new_file );

		$file = $new_file;

		return $file;

	}

	/**
	 * Delete a file
	 *
	 * @param  string $filepath
	 *
	 * @return bool
	 */
	private function delete_file( $filepath ) {

		return is_readable( $filepath ) ? @unlink( $filepath ) : false;

	}

}
