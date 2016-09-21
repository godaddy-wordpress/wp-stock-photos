<?php

use Codeception\Util\Debug;

class AdminTestCest {

	/**
	 * Custom post to work with
	 *
	 * @var null
	 */
	static $post = null;

	/**
	 * Login before every test
	 *
	 * @param AcceptanceTester $I
	 */
	public function _before( AcceptanceTester $I ) {

		$this->login( $I );

		$this->getPost();

	}

	/**
	 * Helping function to login without checking cookie since not compatible
	 * with browserstack ie8-9
	 *
	 * @param AcceptanceTester $I
	 */
	protected function login( AcceptanceTester $I ) {

		//Check if cookie first
		static $cookie = null;

		if ( ! is_null( $cookie ) ) {

			$I->setCookie( AUTH_COOKIE, $cookie );

			return;

		}

		$I->wantTo( 'Log into WordPress admin' );

		// Let's start on the login page
		$I->amOnPage( wp_login_url() );

		// Populate the login form's user id field
		$I->fillField( [ 'id' => 'user_login' ], 'admin' );

		// Populate the login form's password field
		$I->fillField( [ 'id' => 'user_pass' ], 'password' );

		// Submit the login form
		$I->click( [ 'name' => 'wp-submit' ] );

		// Wait for page to load [Hack for Safari and IE]
		$I->waitForElementVisible( [ 'css' => 'body.index-php' ], 5 );

		$cookie = $I->grabCookie( AUTH_COOKIE );

	}

	/**
	 * Get the latest post created
	 */
	protected function getPost() {

		global $sp_post_id;

		if ( is_null( self::$post ) ) {

			self::$post = get_post( $sp_post_id );

		}

	}

	/**
	 * Function to help access the media screen
	 *
	 * @param AcceptanceTester $I
	 */
	protected function mediaScreen( AcceptanceTester $I ) {

		$I->amOnPage( admin_url( 'post.php?action=edit&post=' . self::$post->ID ) );

		$I->click( [ 'id' => 'insert-media-button' ] );

		$I->seeLink( 'Stock Photos' );

		$I->click( [ 'link' => 'Stock Photos' ] );

		$I->wait( 2 );

	}


	public function validateImport( AcceptanceTester $I ) {

		$I->wantTo( 'Make sure we can import an image from the API' );

		$this->mediaScreen( $I );

		$I->click( [ 'css' => '.attachments > .attachment:first-child' ] );

		// Make sure we see the preview of the image
		$I->seeElementInDOM( [ 'css' => '.wpaas-stock-photos.stock-photo-preview .stock-photo-image-preview' ] );

		// Make sure we can go back to the browser
		$I->click( [ 'css' => '.wpaas-stock-photos.stock-photo-preview .backBtn' ] );

		$I->wait( 1 );

		$I->dontSeeElementInDOM( [ 'css' => '.wpaas-stock-photos.stock-photo-preview .stock-photo-image-preview' ] );

		// Going back to the preview screen
		$I->click( [ 'css' => '.attachments > .attachment:first-child' ] );

		$I->wait( 1 );

		// Clicking the import button
		$I->click( [ 'css' => '.media-button-import' ] );

		// Wait for import to finish
		$I->waitForElementNotVisible( [ 'class' => 'wpaas-stock-photos' ], 60 );

		// Check that the image was imported correctly by checking label
		$I->seeElementInDOM( [ 'css' => '.attachment[aria-label*="qtq"]' ] );

		// Delete the image now
		$I->executeJS( 'window.confirm = function(){ return true; }' );

		$I->click( [ 'class' => 'delete-attachment' ] );

	}

	/**
	 * Validate that we can change the industry using simple search
	 *
	 * @param AcceptanceTester $I
	 */
	public function validateCanChangeIndustry( AcceptanceTester $I ) {

		$I->wantTo( 'Make sure we can change category using select2' );

		$this->mediaScreen( $I );

		// Make sure the id of the first attachment is not the same anymore
		$first_id = $I->executeJS( 'return jQuery(".attachments > .attachment:first-child").data("id")'  );

		$I->executeJS( "jQuery('#media-attachment-filters').val('restaurants').trigger('change')" );

		$I->wait( 2 );

		$second_id = $I->executeJS( 'return jQuery(".attachments > .attachment:first-child").data("id")'  );

		$I->assertTrue( $first_id !== $second_id );

	}

	/**
	 * Make sure we see our menu in the customizer
	 *
	 * @param AcceptanceTester $I
	 */
	public function validateMenuInCustomizer( AcceptanceTester $I ) {

		$I->wantTo( 'We can see the menu in the customizer' );

		$I->amOnPage( admin_url( 'customize.php?autofocus[section]=header_image' ) );

		$I->wait( 1 );

		$I->click( [ 'id' => 'header_image-button' ] );

		$I->seeLink( 'Stock Photos' );

	}

}
