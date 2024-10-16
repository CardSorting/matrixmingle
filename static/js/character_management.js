// static/js/character_management.js

document.addEventListener('DOMContentLoaded', () => {
    /**
     * Utility Functions
     */

    /**
     * Debounces a function by the specified wait time.
     * @param {Function} func - The function to debounce.
     * @param {number} wait - The debounce delay in milliseconds.
     * @returns {Function} Debounced function.
     */
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    /**
     * Displays an alert message.
     * @param {string} message - The message to display.
     * @param {string} type - The type of alert ('info', 'success', 'warning', 'danger').
     */
    const displayAlert = (message, type = 'info') => {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        // Prepend alert to body or a specific container
        const alertContainer = document.getElementById('alert-container') || document.body;
        alertContainer.prepend(alertDiv);

        // Automatically remove alert after 5 seconds
        setTimeout(() => {
            const alert = bootstrap.Alert.getInstance(alertDiv);
            if (alert) {
                alert.close();
            }
        }, 5000);
    };

    /**
     * Randomly selects an item from an array.
     * @param {Array} array - The array to select from.
     * @returns {*} A random item from the array.
     */
    const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];

    /**
     * Validates the file type of an uploaded avatar.
     * @param {File} file - The file to validate.
     * @returns {boolean} Whether the file type is valid.
     */
    const validateFileType = (file) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
        return allowedTypes.includes(file.type);
    };

    /**
     * Forms and Containers
     */
    const form = document.getElementById('createCharacterForm');
    const steps = Array.from(document.querySelectorAll('.step'));
    const prevBtn = document.getElementById('prevStep');
    const nextBtn = document.getElementById('nextStep');
    const submitBtn = document.getElementById('submitCharacter');
    const quickCreateBtn = document.getElementById('quickCreateBtn');
    const saveProgressBtn = document.getElementById('saveProgressBtn');
    const customAvatarRadio = document.getElementById('customAvatar');
    const avatarUpload = document.getElementById('avatarUpload');
    const avatarOptions = document.querySelectorAll('input[name="avatar"]');
    const previewContainer = document.getElementById('avatarPreview');

    // Preview Elements
    const previewName = document.getElementById('previewName');
    const previewDescription = document.getElementById('previewDescription');
    const previewPersonality = document.getElementById('previewPersonality');
    const previewSkills = document.getElementById('previewSkills');
    const previewBackground = document.getElementById('previewBackground');

    let currentStep = 1;

    /**
     * Initialize Form Wizard
     */
    const showStep = (stepNumber) => {
        steps.forEach((step, index) => {
            step.style.display = index + 1 === stepNumber ? 'block' : 'none';
        });

        prevBtn.style.display = stepNumber === 1 ? 'none' : 'inline-block';
        nextBtn.style.display = stepNumber === steps.length ? 'none' : 'inline-block';
        submitBtn.style.display = stepNumber === steps.length ? 'inline-block' : 'none';

        currentStep = stepNumber;
    };

    /**
     * Navigate Between Steps
     */
    const navigateStep = (direction) => {
        const newStep = currentStep + direction;
        if (newStep > 0 && newStep <= steps.length) {
            if (validateStep(currentStep)) {
                showStep(newStep);
            }
        }
    };

    /**
     * Validate a Specific Step
     * @param {number} stepNumber - The step number to validate.
     * @returns {boolean} Whether the step is valid.
     */
    const validateStep = (stepNumber) => {
        const step = steps[stepNumber - 1];
        const inputs = step.querySelectorAll('input[required], textarea[required]');
        let isValid = true;

        inputs.forEach((input) => {
            if (!input.value.trim()) {
                isValid = false;
                input.classList.add('is-invalid');
                const feedback = input.nextElementSibling;
                if (feedback && feedback.classList.contains('invalid-feedback')) {
                    feedback.style.display = 'block';
                }
            } else {
                input.classList.remove('is-invalid');
                const feedback = input.nextElementSibling;
                if (feedback && feedback.classList.contains('invalid-feedback')) {
                    feedback.style.display = 'none';
                }
            }
        });

        return isValid;
    };

    /**
     * Validate the Entire Form
     * @returns {boolean} Whether the form is valid.
     */
    const validateForm = () => {
        let isValid = true;
        steps.forEach((_, index) => {
            if (!validateStep(index + 1)) {
                isValid = false;
            }
        });
        return isValid;
    };

    /**
     * Update the Character Preview
     */
    const updatePreview = () => {
        previewName.textContent = document.getElementById('name').value.trim() || 'Character Name';
        previewDescription.textContent = document.getElementById('description').value.trim() || 'Character description will appear here.';
        previewPersonality.textContent = document.getElementById('personality').value.trim() || 'Not specified';
        previewSkills.textContent = document.getElementById('skills').value.trim() || 'Not specified';
        previewBackground.textContent = document.getElementById('background').value.trim() || 'Not specified';

        // Autosave progress
        saveProgress();
    };

    /**
     * Quick Create Functionality
     */
    const quickCreate = () => {
        const names = ['Aria', 'Zephyr', 'Luna', 'Orion', 'Nova', 'Atlas', 'Cora', 'Finn'];
        const personalities = ['Cheerful and optimistic', 'Mysterious and brooding', 'Logical and analytical', 'Adventurous and daring'];
        const skills = ['Master of disguise', 'Expert hacker', 'Skilled negotiator', 'Martial arts expert'];
        const backgrounds = ['Former spy turned rogue', 'Orphaned prodigy seeking answers', 'Time traveler from the future', 'Amnesiac with a hidden past'];

        document.getElementById('name').value = getRandomItem(names);
        document.getElementById('description').value = 'A complex character with a unique blend of traits and experiences.';
        document.getElementById('personality').value = getRandomItem(personalities);
        document.getElementById('skills').value = getRandomItem(skills);
        document.getElementById('background').value = getRandomItem(backgrounds);

        // Select a random avatar
        const avatars = Array.from(avatarOptions).filter((option) => option.value !== 'custom');
        const randomAvatar = getRandomItem(avatars);
        randomAvatar.checked = true;
        randomAvatar.dispatchEvent(new Event('change'));

        // Clear and disable custom avatar upload
        avatarUpload.value = '';
        avatarUpload.disabled = true;

        updatePreview();
    };

    /**
     * Save Form Progress to Local Storage
     */
    const saveProgress = debounce(() => {
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            if (key !== 'avatarUpload') {
                data[key] = value;
            }
        });
        localStorage.setItem('characterCreationProgress', JSON.stringify(data));
    }, 500);

    /**
     * Load Saved Progress from Local Storage
     */
    const loadProgress = () => {
        const savedData = localStorage.getItem('characterCreationProgress');
        if (savedData) {
            const data = JSON.parse(savedData);
            Object.entries(data).forEach(([key, value]) => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) {
                    if (input.type === 'radio') {
                        const radioToCheck = form.querySelector(`input[name="${key}"][value="${value}"]`);
                        if (radioToCheck) {
                            radioToCheck.checked = true;
                            radioToCheck.dispatchEvent(new Event('change'));
                        }
                    } else {
                        input.value = value;
                    }
                }
            });

            if (data.avatar === 'custom') {
                avatarUpload.disabled = false;
                updateAvatarPreview(''); // Cannot restore uploaded file
            }

            updatePreview();
        }
    };

    /**
     * Update the Avatar Preview
     * @param {string} src - The source URL of the avatar image.
     */
    const updateAvatarPreview = (src) => {
        previewContainer.innerHTML = src
            ? `<img src="${src}" alt="Selected Avatar" class="img-thumbnail" style="width: 64px; height: 64px;">`
            : '';
    };

    /**
     * Display Error Messages
     * @param {Object} errors - The errors to display.
     */
    const displayErrors = (errors) => {
        // Clear existing error messages
        const inputs = form.querySelectorAll('input, textarea');
        inputs.forEach((input) => {
            input.classList.remove('is-invalid');
            const feedback = input.nextElementSibling;
            if (feedback && feedback.classList.contains('invalid-feedback')) {
                feedback.textContent = '';
                feedback.style.display = 'none';
            }
        });

        // Display new error messages
        for (const field in errors) {
            if (field === 'error') {
                displayAlert(errors[field], 'danger');
                continue;
            }
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                input.classList.add('is-invalid');
                const feedback = input.nextElementSibling;
                if (feedback && feedback.classList.contains('invalid-feedback')) {
                    feedback.textContent = errors[field];
                    feedback.style.display = 'block';
                }
            }
        }
    };

    /**
     * Event Listeners
     */

    // Wizard Navigation
    prevBtn.addEventListener('click', () => navigateStep(-1));
    nextBtn.addEventListener('click', () => navigateStep(1));

    // Debounced Preview Update
    const debouncedUpdatePreview = debounce(updatePreview, 300);
    form.addEventListener('input', debouncedUpdatePreview);

    // Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (validateForm()) {
            const attributes = {
                personality: document.getElementById('personality').value.trim(),
                skills: document.getElementById('skills').value.trim(),
                background: document.getElementById('background').value.trim(),
            };
            document.getElementById('attributes-json').value = JSON.stringify(attributes);

            try {
                const formData = new FormData(form);
                const response = await fetch(form.action, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json'
                    },
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.redirect_url) {
                        window.location.href = data.redirect_url;
                    } else {
                        window.location.href = '/dashboard';
                    }
                } else {
                    const data = await response.json();
                    displayErrors(data.errors || { error: 'Failed to create character. Please try again.' });
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                displayErrors({ error: 'An unexpected error occurred. Please try again later.' });
            }
        }
    });

    // Quick Create
    quickCreateBtn.addEventListener('click', quickCreate);

    // Save Progress
    saveProgressBtn.addEventListener('click', saveProgress);

    // Custom Avatar Upload
    customAvatarRadio.addEventListener('change', () => {
        avatarUpload.disabled = !customAvatarRadio.checked;
        if (!customAvatarRadio.checked) {
            avatarUpload.value = '';
            updateAvatarPreview('');
        }
    });

    // Avatar Selection
    avatarOptions.forEach((avatarOption) => {
        avatarOption.addEventListener('change', (e) => {
            const selectedAvatar = e.target.value;
            if (selectedAvatar !== 'custom') {
                updateAvatarPreview(`/static/images/avatars/${selectedAvatar}`);
                avatarUpload.disabled = true;
                avatarUpload.value = '';
            } else {
                updateAvatarPreview('');
                avatarUpload.disabled = false;
            }
        });
    });

    // Custom Avatar File Selection
    avatarUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (validateFileType(file)) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    updateAvatarPreview(event.target.result);
                };
                reader.readAsDataURL(file);
            } else {
                displayAlert('Invalid file type. Please select a valid image file (PNG, JPEG, or GIF).', 'danger');
                avatarUpload.value = '';
                updateAvatarPreview('');
            }
        }
    });

    // Keyboard Navigation for Form Steps
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            nextBtn.click();
        } else if (e.key === 'ArrowLeft') {
            prevBtn.click();
        }
    });

    /**
     * Initialize Form Wizard and Load Progress
     */
    const initialize = () => {
        showStep(currentStep);
        loadProgress();

        // Accessibility: Focus on the first input of the first step
        const firstInput = steps[0].querySelector('input, textarea');
        if (firstInput) firstInput.focus();
    };

    /**
     * Initialize the Script
     */
    initialize();
});