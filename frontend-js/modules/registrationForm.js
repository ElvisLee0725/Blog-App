import axios from 'axios';

export default class RegistrationForm {
  constructor() {
    this.formSubmitHandler = this.formSubmitHandler.bind(this);
    this._csrf = document.querySelector('[name="_csrf"]').value;
    this.form = document.querySelector('#registration-form');
    this.allFields = document.querySelectorAll(
      '#registration-form .form-control'
    );
    this.insertValidationElements();
    this.username = document.querySelector('#username-register');
    this.username.previousValue = '';
    this.email = document.querySelector('#email-register');
    this.email.previousValue = '';
    this.password = document.querySelector('#password-register');
    this.password.previousValue = '';
    this.username.isUnique = false;
    this.email.isUnique = false;
    this.events();
  }

  events() {
    this.form.addEventListener('submit', this.formSubmitHandler);

    this.username.addEventListener('keyup', () => {
      this.isDifferent(this.username, this.usernameHandler);
    });

    this.email.addEventListener('keyup', () => {
      this.isDifferent(this.email, this.emailHandler);
    });

    this.password.addEventListener('keyup', () => {
      this.isDifferent(this.password, this.passwordHandler);
    });

    this.username.addEventListener('blur', () => {
      this.isDifferent(this.username, this.usernameHandler);
    });

    this.email.addEventListener('blur', () => {
      this.isDifferent(this.email, this.emailHandler);
    });

    this.password.addEventListener('blur', () => {
      this.isDifferent(this.password, this.passwordHandler);
    });
  }

  formSubmitHandler(e) {
    e.preventDefault();
    // Run each check manually
    this.usernameImmediately();
    this.usernameAfterDelay();
    this.emailAfterDelay();
    this.passwordImmediately();
    this.passwordAfterDelay();

    // Only submit form if username and email is unique and there is no errors in all fields
    if (
      this.username.isUnique &&
      !this.username.errors &&
      this.email.isUnique &&
      !this.email.errors &&
      !this.password.errors
    ) {
      this.form.submit();
    }
  }

  isDifferent(el, handler) {
    if (el.previousValue != el.value) {
      handler.call(this); // Make 'this' still pointing to the registrationForm object
    }
    el.previousValue = el.value;
  }

  // Handle username key stroke: Respond with checking immedately and check after some delay
  usernameHandler() {
    this.username.errors = false; // Clean errors each time
    this.usernameImmediately();
    clearTimeout(this.username.timer);
    this.username.timer = setTimeout(() => this.usernameAfterDelay(), 2000);
  }

  usernameImmediately() {
    const usernameVal = this.username.value;
    // User Regex to test if username contains non-alphanumeric characters
    if (usernameVal !== '' && !/^([a-zA-Z0-9]+)$/.test(usernameVal)) {
      this.showValidationError(
        this.username,
        'Username can only contain letters and numbers.'
      );
    }

    if (usernameVal.length > 30) {
      this.showValidationError(
        this.username,
        "Username can't exceed 30 characters."
      );
    }

    if (!this.username.errors) {
      this.hideValidationError(this.username);
    }
  }

  usernameAfterDelay() {
    const usernameVal = this.username.value;
    if (usernameVal.length < 3) {
      this.showValidationError(
        this.username,
        'Username must be at least 3 characters.'
      );
    }

    // Check if the username is already in the database
    if (!this.username.errors) {
      axios
        .post('/doesUsernameExist', {
          _csrf: this._csrf,
          username: usernameVal,
        })
        .then((response) => {
          if (response.data) {
            this.showValidationError(
              this.username,
              'That username is already taken'
            );
            this.username.isUnique = false;
          } else {
            this.username.isUnique = true;
          }
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }

  emailHandler() {
    this.email.errors = false; // Clean errors each time
    clearTimeout(this.email.timer);
    this.email.timer = setTimeout(() => this.emailAfterDelay(), 2000);
  }

  emailAfterDelay() {
    const emailVal = this.email.value;
    if (!/^\S+@\S+$/.test(emailVal)) {
      this.showValidationError(
        this.email,
        'You must provide a valid email address.'
      );
    }

    if (!this.email.errors) {
      axios
        .post('/doesEmailExist', {
          _csrf: this._csrf,
          email: emailVal,
        })
        .then((response) => {
          if (response.data) {
            this.email.isUnique = false;
            this.showValidationError(
              this.email,
              'That email is already being used.'
            );
          } else {
            this.email.isUnique = true;
            this.hideValidationError(this.email);
          }
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }

  passwordHandler() {
    this.password.errors = false; // Clean errors each time
    this.passwordImmediately();
    clearTimeout(this.password.timer);
    this.password.timer = setTimeout(() => this.passwordAfterDelay(), 2000);
  }

  passwordImmediately() {
    if (this.password.value.length > 50) {
      this.showValidationError(
        this.password,
        'Password cannot exceed 50 characters.'
      );
    }

    if (!this.password.errors) {
      this.hideValidationError(this.password);
    }
  }

  passwordAfterDelay() {
    if (this.password.value.length < 6) {
      this.showValidationError(
        this.password,
        'Password must be at least 6 characters.'
      );
    }
  }

  hideValidationError(el) {
    el.nextElementSibling.classList.remove('liveValidateMessage--visible');
  }

  showValidationError(el, message) {
    // Insert the message to the <div> formed in insertValidationElements()
    el.nextElementSibling.innerHTML = message;
    el.nextElementSibling.classList.add('liveValidateMessage--visible');
    el.errors = true;
  }

  insertValidationElements() {
    this.allFields.forEach((el) => {
      el.insertAdjacentHTML(
        'afterend',
        '<div class="alert alert-danger small liveValidateMessage"></div>'
      );
    });
  }
}
