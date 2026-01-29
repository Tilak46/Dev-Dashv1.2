document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.querySelector('.login-btn');

    // Add ripple effect to button
    loginBtn.addEventListener('click', function(e) {
        let x = e.clientX - e.target.offsetLeft;
        let y = e.clientY - e.target.offsetTop;
        
        let ripples = document.createElement('span');
        ripples.style.left = x + 'px';
        ripples.style.top = y + 'px';
        ripples.classList.add('ripple');
        this.appendChild(ripples);

        setTimeout(() => {
            ripples.remove();
        }, 1000);
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = emailInput.value;
        const password = passwordInput.value;
        const btnOriginalText = loginBtn.querySelector('span').innerText;
        
        // Simple Validation Simulation
        if(email && password) {
            // Simulate loading state
            loginBtn.disabled = true;
            loginBtn.querySelector('span').innerText = 'Brewing...';
            loginBtn.style.opacity = '0.8';
            loginBtn.style.cursor = 'wait';

            setTimeout(() => {
                loginBtn.querySelector('span').innerText = 'Success!';
                loginBtn.style.backgroundColor = 'var(--success-green)';
                
                alert(`Welcome back to The Daily Grind, ${email}!`);
                
                // Reset form
                loginForm.reset();
                
                // Reset button after a moment
                setTimeout(() => {
                    loginBtn.disabled = false;
                    loginBtn.querySelector('span').innerText = btnOriginalText;
                    loginBtn.style.backgroundColor = 'var(--primary-brown)';
                    loginBtn.style.opacity = '1';
                    loginBtn.style.cursor = 'pointer';
                }, 2000);
            }, 1500);
        }
    });

    // Input focus animation helper (if needed for older browsers, 
    // mostly handled by CSS :focus-within or :focus)
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('focused');
        });
        input.addEventListener('blur', () => {
            if (input.value === '') {
                input.parentElement.classList.remove('focused');
            }
        });
    });
});
