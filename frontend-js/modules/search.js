import axios from "axios";
import DOMPurify from "dompurify";

export default class Search {
    // Select DOM elements and keep track of data
    constructor() {
        this.injectHTML();
        this._csrf = document.querySelector('[name="_csrf"]').value;
        this.domElements = {
            headerSearchIcon: document.querySelector('.header-search-icon'),
            overlay: document.querySelector('.search-overlay'),
            closeIcon: document.querySelector('.close-live-search'),
            inputField: document.querySelector('#live-search-field'),
            resultsArea: document.querySelector('.live-search-results'),
            loaderIcon: document.querySelector('.circle-loader')
        };
        this.typingWaitTimer;
        this.previousValue = "";

        this.keyPressHandler = this.keyPressHandler.bind(this);
        this.openOverlay = this.openOverlay.bind(this);
        this.closeOverlay = this.closeOverlay.bind(this);
        this.addEventListeners();
    }

    // Events
    addEventListeners() {
        this.domElements.inputField.addEventListener('keyup', this.keyPressHandler);
        this.domElements.headerSearchIcon.addEventListener('click', this.openOverlay);
        this.domElements.closeIcon.addEventListener('click', this.closeOverlay);
    }
    
    // Methods
    keyPressHandler() {
      let value = this.domElements.inputField.value;

      if(value === '') {
        clearTimeout(this.typingWaitTimer);
        this.hideLoaderIcon();
        this.hideResultsArea();
      }
      if(value !== "" && value !== this.previousValue) {
        clearTimeout(this.typingWaitTimer);
        this.showLoaderIcon();
        this.hideResultsArea();
        this.typingWaitTimer = setTimeout(() => this.sendRequest(), 1000);
      }

      this.previousValue = value;
    }

    sendRequest() {
      axios.post('/search', { 
          _csrf: this._csrf,
          searchTerm: this.domElements.inputField.value 
        })
        .then((response) => {
          this.renderResultsHTML(response.data);
        })
        .catch(() => {
          alert('Axios fails...');
        });
    }

    renderResultsHTML(posts) {
      if(posts.length > 0) {
        this.domElements.resultsArea.innerHTML = DOMPurify.sanitize(`<div class="list-group shadow-sm">
        <div class="list-group-item active"><strong>Search Results</strong> (${posts.length > 1 ? `${posts.length} items found` : '1 item found'})</div>
          ${posts.map((post) => {
              const postDate = new Date(post.createdDate);
              return `<a href="/post/${post._id}" class="list-group-item list-group-item-action">
              <img class="avatar-tiny" src="${post.author.avatar}"> <strong>${post.title}</strong>
              <span class="text-muted small">by ${post.author.username} on ${postDate.getMonth() + 1}/${postDate.getDate()}/${postDate.getFullYear()}</span>
            </a>`;
          }).join('')}
      </div>`);
      }
      else {
        this.domElements.resultsArea.innerHTML = `<p class="alert alert-danger text-center shadow-sm">Sorry, we could not find any result for that search.</p>`;
      }

      this.hideLoaderIcon();
      this.showResultsArea();
    }

    showLoaderIcon() {
      this.domElements.loaderIcon.classList.add('circle-loader--visible');
    }

    hideLoaderIcon() {
      this.domElements.loaderIcon.classList.remove('circle-loader--visible');
    }

    showResultsArea() {
      this.domElements.resultsArea.classList.add('live-search-results--visible');
    }

    hideResultsArea() {
      this.domElements.resultsArea.classList.remove('live-search-results--visible');
    }

    openOverlay(e) {
        e.preventDefault();
        this.domElements.overlay.classList.add('search-overlay--visible');
        setTimeout(() => {
          this.domElements.inputField.focus();
        }, 50);
    }

    closeOverlay() {
        this.domElements.overlay.classList.remove('search-overlay--visible');
    }

    injectHTML() {
        document.body.insertAdjacentHTML('beforeend', `<div class="search-overlay">
        <div class="search-overlay-top shadow-sm">
          <div class="container container--narrow">
            <label for="live-search-field" class="search-overlay-icon"><i class="fas fa-search"></i></label>
            <input type="text" id="live-search-field" class="live-search-field" placeholder="What are you interested in?">
            <span class="close-live-search"><i class="fas fa-times-circle"></i></span>
          </div>
        </div>
    
        <div class="search-overlay-bottom">
          <div class="container container--narrow py-3">
            <div class="circle-loader"></div>
            <div class="live-search-results">
              
            </div>
          </div>
        </div>
      </div>`);
    }
}