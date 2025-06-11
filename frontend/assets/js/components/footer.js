// Footer.js - Componente do rodapé
// =====================================================

const Footer = (() => {
    let isInitialized = false;

    // Inicializa o footer
    const init = async () => {
        if (isInitialized) return;

        try {
            const response = await fetch('/components/footer.html');
            const html = await response.text();
            
            const footerRoot = document.getElementById('footer-root');
            if (footerRoot) {
                footerRoot.innerHTML = html;
                
                // Configura event listeners
                setupEventListeners();
                
                isInitialized = true;
            }
        } catch (error) {
            console.error('Erro ao carregar footer:', error);
        }
    };

    // Configura event listeners
    const setupEventListeners = () => {
        // Newsletter form
        const newsletterForm = document.getElementById('newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', handleNewsletterSubmit);
        }

        // Links do footer
        const footerLinks = document.querySelectorAll('.footer-links a');
        footerLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                App.navigateTo(href);
            });
        });
    };

    // Handle newsletter submit
    const handleNewsletterSubmit = async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const emailInput = form.querySelector('input[type="email"]');
        const submitButton = form.querySelector('button[type="submit"]');
        const email = emailInput.value.trim();
        
        if (!email) return;
        
        // Desabilita form durante envio
        emailInput.disabled = true;
        submitButton.disabled = true;
        submitButton.innerHTML = '<div class="spinner"></div>';
        
        try {
            // Aqui você faria a chamada para API
            // await API.newsletter.subscribe({ email });
            
            // Simula delay de API
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            Toast.success('E-mail cadastrado com sucesso!');
            form.reset();
        } catch (error) {
            Toast.error('Erro ao cadastrar e-mail. Tente novamente.');
        } finally {
            // Reabilita form
            emailInput.disabled = false;
            submitButton.disabled = false;
            submitButton.innerHTML = '<span class="material-icons">send</span>';
        }
    };

    // API pública
    return {
        init
    };
})();

// Torna Footer global
window.Footer = Footer;