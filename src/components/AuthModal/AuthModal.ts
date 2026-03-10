import './AuthModal.css';
import { signUp, signIn, checkUsernameAvailable } from '../../lib/auth';
import { savePendingAvatar, savePendingBanner } from '../../data/authStore';

export interface AuthModalInstance {
  getElement(): HTMLDivElement;
  showLogin(): void;
  showRegister(): void;
  close(): void;
}

const INTEREST_CATEGORIES = [
  { id: 'musica', label: 'Música', icon: '🎵' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'tecnologia', label: 'Tecnología', icon: '💻' },
  { id: 'cocina', label: 'Cocina', icon: '🍳' },
  { id: 'deportes', label: 'Deportes', icon: '⚽' },
  { id: 'arte', label: 'Arte', icon: '🎨' },
  { id: 'ciencia', label: 'Ciencia', icon: '🔬' },
  { id: 'comedia', label: 'Comedia', icon: '😂' },
  { id: 'educacion', label: 'Educación', icon: '📚' },
  { id: 'viajes', label: 'Viajes', icon: '✈️' },
  { id: 'moda', label: 'Moda', icon: '👗' },
  { id: 'fitness', label: 'Fitness', icon: '💪' },
];

const EYE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

function createPasswordField(placeholder: string) {
  const wrapper = document.createElement('div');
  wrapper.className = 'auth-password-wrapper';

  const input = document.createElement('input');
  input.className = 'auth-modal-input';
  input.type = 'password';
  input.placeholder = placeholder;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'auth-password-toggle';
  toggle.innerHTML = EYE_ICON;
  toggle.setAttribute('aria-label', 'Mostrar contraseña');

  toggle.addEventListener('click', () => {
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    toggle.innerHTML = visible ? EYE_ICON : EYE_OFF_ICON;
    toggle.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });

  wrapper.append(input, toggle);
  return { wrapper, input };
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AuthModal(): AuthModalInstance {
  const overlay = document.createElement('div');
  overlay.className = 'auth-modal-overlay';

  const card = document.createElement('div');
  card.className = 'auth-modal';

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'auth-modal-close';
  closeBtn.setAttribute('aria-label', 'Cerrar');
  closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  // =====================
  // LOGIN FORM
  // =====================
  const loginForm = document.createElement('div');
  loginForm.className = 'auth-modal-form auth-login';

  const loginTitle = document.createElement('h2');
  loginTitle.className = 'auth-modal-title';
  loginTitle.textContent = 'Iniciar sesión';

  const loginEmail = document.createElement('input');
  loginEmail.className = 'auth-modal-input';
  loginEmail.type = 'email';
  loginEmail.placeholder = 'Correo electrónico';

  const loginPw = createPasswordField('Contraseña');
  const loginPassword = loginPw.input;

  const loginError = document.createElement('div');
  loginError.className = 'auth-modal-error';

  const loginSubmit = document.createElement('button');
  loginSubmit.className = 'auth-modal-submit';
  loginSubmit.textContent = 'Entrar';

  loginForm.append(loginTitle, loginEmail, loginPw.wrapper, loginError, loginSubmit);

  loginSubmit.addEventListener('click', async () => {
    loginError.classList.remove('visible');

    if (!loginEmail.value.trim() || !loginPassword.value) {
      loginError.textContent = 'Completa todos los campos';
      loginError.classList.add('visible');
      return;
    }

    loginSubmit.disabled = true;
    loginSubmit.textContent = 'Entrando...';

    const { error } = await signIn(loginEmail.value.trim(), loginPassword.value);

    if (error) {
      loginSubmit.disabled = false;
      loginSubmit.textContent = 'Entrar';

      if (error.message.includes('Email not confirmed')) {
        loginError.textContent = 'Debes verificar tu correo antes de iniciar sesión';
      } else if (error.message.includes('Invalid login credentials')) {
        loginError.textContent = 'Correo o contraseña incorrectos';
      } else {
        loginError.textContent = error.message;
      }
      loginError.classList.add('visible');
      return;
    }

    loginSubmit.disabled = false;
    loginSubmit.textContent = 'Entrar';
    close();
  });

  // =====================
  // REGISTER FORM (6 steps)
  // =====================
  const registerForm = document.createElement('div');
  registerForm.className = 'auth-modal-form auth-register';

  // Step indicator (6 dots)
  const stepsContainer = document.createElement('div');
  stepsContainer.className = 'auth-steps';
  const dots: HTMLSpanElement[] = [];
  for (let i = 0; i < 6; i++) {
    const dot = document.createElement('span');
    dot.className = 'auth-step-dot' + (i === 0 ? ' active' : '');
    dots.push(dot);
    stepsContainer.appendChild(dot);
  }

  // ===========================
  // STEP 1 — Credenciales
  // ===========================
  const step1 = document.createElement('div');
  step1.className = 'auth-register-step active';

  const title1 = document.createElement('h2');
  title1.className = 'auth-modal-title';
  title1.textContent = 'Crear cuenta';

  const regEmail = document.createElement('input');
  regEmail.className = 'auth-modal-input';
  regEmail.type = 'email';
  regEmail.placeholder = 'Correo electrónico';

  const regPw = createPasswordField('Contraseña');
  const regPassword = regPw.input;

  const regPwConfirm = createPasswordField('Confirmar contraseña');
  const regPasswordConfirm = regPwConfirm.input;

  const credError = document.createElement('div');
  credError.className = 'auth-modal-error';

  const next1 = document.createElement('button');
  next1.className = 'auth-modal-submit';
  next1.textContent = 'Siguiente';

  step1.append(title1, regEmail, regPw.wrapper, regPwConfirm.wrapper, credError, next1);

  next1.addEventListener('click', () => {
    credError.classList.remove('visible');
    if (!regEmail.value.trim()) {
      credError.textContent = 'El correo electrónico es obligatorio';
      credError.classList.add('visible');
      return;
    }
    if (!regPassword.value) {
      credError.textContent = 'La contraseña es obligatoria';
      credError.classList.add('visible');
      return;
    }
    if (!regPasswordConfirm.value) {
      credError.textContent = 'Debes confirmar la contraseña';
      credError.classList.add('visible');
      return;
    }
    if (regPassword.value !== regPasswordConfirm.value) {
      credError.textContent = 'Las contraseñas no coinciden';
      credError.classList.add('visible');
      return;
    }
    goToStep(2);
  });

  // ===========================
  // STEP 2 — Políticas
  // ===========================
  const step2 = document.createElement('div');
  step2.className = 'auth-register-step';

  const title2 = document.createElement('h2');
  title2.className = 'auth-modal-title';
  title2.textContent = 'Términos y condiciones';

  const policyIntro = document.createElement('p');
  policyIntro.className = 'auth-modal-subtitle';
  policyIntro.textContent = 'Para continuar, acepta nuestras políticas.';

  const privacyCheck = document.createElement('label');
  privacyCheck.className = 'auth-modal-checkbox';
  const privacyInput = document.createElement('input');
  privacyInput.type = 'checkbox';
  const privacySpan = document.createElement('span');
  privacySpan.innerHTML = 'Acepto la <a href="#" class="auth-modal-link">Política de Privacidad</a>';
  privacyCheck.append(privacyInput, privacySpan);

  const termsCheck = document.createElement('label');
  termsCheck.className = 'auth-modal-checkbox';
  const termsInput = document.createElement('input');
  termsInput.type = 'checkbox';
  const termsSpan = document.createElement('span');
  termsSpan.innerHTML = 'Acepto los <a href="#" class="auth-modal-link">Términos de Uso</a>';
  termsCheck.append(termsInput, termsSpan);

  const policyError = document.createElement('div');
  policyError.className = 'auth-modal-error';
  policyError.textContent = 'Debes aceptar ambas políticas para continuar';

  const next2 = document.createElement('button');
  next2.className = 'auth-modal-submit';
  next2.textContent = 'Siguiente';

  const back2 = document.createElement('div');
  back2.className = 'auth-modal-back';
  back2.textContent = 'Volver';

  step2.append(title2, policyIntro, privacyCheck, termsCheck, policyError, next2, back2);

  next2.addEventListener('click', () => {
    policyError.classList.remove('visible');
    if (!privacyInput.checked || !termsInput.checked) {
      policyError.classList.add('visible');
      return;
    }
    goToStep(3);
  });
  back2.addEventListener('click', () => goToStep(1));

  // ===========================
  // STEP 3 — Identidad
  // ===========================
  const step3 = document.createElement('div');
  step3.className = 'auth-register-step';

  const title3 = document.createElement('h2');
  title3.className = 'auth-modal-title';
  title3.textContent = 'Tu identidad';

  const displayName = document.createElement('input');
  displayName.className = 'auth-modal-input';
  displayName.type = 'text';
  displayName.placeholder = 'Nombre para mostrar';

  const usernameWrapper = document.createElement('div');
  usernameWrapper.className = 'auth-username-wrapper';
  const usernamePrefix = document.createElement('span');
  usernamePrefix.className = 'auth-username-prefix';
  usernamePrefix.textContent = '@';
  const usernameInput = document.createElement('input');
  usernameInput.className = 'auth-modal-input auth-username-input';
  usernameInput.type = 'text';
  usernameInput.placeholder = 'usuario';
  usernameWrapper.append(usernamePrefix, usernameInput);

  const birthLabel = document.createElement('div');
  birthLabel.className = 'auth-upload-label';
  birthLabel.textContent = 'Fecha de nacimiento';

  const birthDate = document.createElement('input');
  birthDate.className = 'auth-modal-input';
  birthDate.type = 'date';

  const next3 = document.createElement('button');
  next3.className = 'auth-modal-submit';
  next3.textContent = 'Siguiente';

  const back3 = document.createElement('div');
  back3.className = 'auth-modal-back';
  back3.textContent = 'Volver';

  const identityError = document.createElement('div');
  identityError.className = 'auth-modal-error';

  step3.append(title3, displayName, usernameWrapper, birthLabel, birthDate, identityError, next3, back3);

  next3.addEventListener('click', () => {
    identityError.classList.remove('visible');
    if (!displayName.value.trim()) {
      identityError.textContent = 'El nombre para mostrar es obligatorio';
      identityError.classList.add('visible');
      return;
    }
    if (!usernameInput.value.trim()) {
      identityError.textContent = 'El nombre de usuario es obligatorio';
      identityError.classList.add('visible');
      return;
    }
    if (!birthDate.value) {
      identityError.textContent = 'La fecha de nacimiento es obligatoria';
      identityError.classList.add('visible');
      return;
    }
    goToStep(4);
  });
  back3.addEventListener('click', () => goToStep(2));

  // ===========================
  // STEP 4 — Perfil visual
  // ===========================
  const step4 = document.createElement('div');
  step4.className = 'auth-register-step';

  const title4 = document.createElement('h2');
  title4.className = 'auth-modal-title';
  title4.textContent = 'Personaliza tu perfil';

  // Banner upload
  const bannerLabel = document.createElement('div');
  bannerLabel.className = 'auth-upload-label';
  bannerLabel.textContent = 'Banner';

  const bannerUpload = document.createElement('div');
  bannerUpload.className = 'auth-banner-upload';
  const bannerPreview = document.createElement('img');
  bannerPreview.className = 'auth-banner-preview';
  bannerPreview.style.display = 'none';
  const bannerPlaceholder = document.createElement('div');
  bannerPlaceholder.className = 'auth-banner-placeholder';
  bannerPlaceholder.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Subir banner</span>`;
  const bannerInput = document.createElement('input');
  bannerInput.type = 'file';
  bannerInput.accept = 'image/*';
  bannerInput.className = 'auth-file-input';
  let bannerFile: File | null = null;

  bannerUpload.append(bannerPreview, bannerPlaceholder, bannerInput);
  bannerUpload.addEventListener('click', () => bannerInput.click());
  bannerInput.addEventListener('change', () => {
    const file = bannerInput.files?.[0];
    if (file) {
      bannerFile = file;
      bannerPreview.src = URL.createObjectURL(file);
      bannerPreview.style.display = 'block';
      bannerPlaceholder.style.display = 'none';
    }
  });

  // Avatar upload
  const avatarLabel = document.createElement('div');
  avatarLabel.className = 'auth-upload-label';
  avatarLabel.textContent = 'Foto de perfil';

  const avatarUpload = document.createElement('div');
  avatarUpload.className = 'auth-avatar-upload';
  const avatarPreview = document.createElement('img');
  avatarPreview.className = 'auth-avatar-preview';
  avatarPreview.style.display = 'none';
  const avatarPlaceholder = document.createElement('div');
  avatarPlaceholder.className = 'auth-avatar-placeholder';
  avatarPlaceholder.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
  const avatarInput = document.createElement('input');
  avatarInput.type = 'file';
  avatarInput.accept = 'image/*';
  avatarInput.className = 'auth-file-input';
  let avatarFile: File | null = null;

  avatarUpload.append(avatarPreview, avatarPlaceholder, avatarInput);
  avatarUpload.addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files?.[0];
    if (file) {
      avatarFile = file;
      avatarPreview.src = URL.createObjectURL(file);
      avatarPreview.style.display = 'block';
      avatarPlaceholder.style.display = 'none';
    }
  });

  // Bio
  const bioLabel = document.createElement('div');
  bioLabel.className = 'auth-upload-label';
  bioLabel.textContent = 'Bio';

  const bioInput = document.createElement('textarea');
  bioInput.className = 'auth-modal-input auth-modal-textarea';
  bioInput.placeholder = 'Cuéntanos sobre ti...';
  bioInput.rows = 3;

  const next4 = document.createElement('button');
  next4.className = 'auth-modal-submit';
  next4.textContent = 'Siguiente';

  const back4 = document.createElement('div');
  back4.className = 'auth-modal-back';
  back4.textContent = 'Volver';

  step4.append(title4, bannerLabel, bannerUpload, avatarLabel, avatarUpload, bioLabel, bioInput, next4, back4);

  next4.addEventListener('click', () => goToStep(5));
  back4.addEventListener('click', () => goToStep(3));

  // ===========================
  // STEP 5 — Intereses
  // ===========================
  const step5 = document.createElement('div');
  step5.className = 'auth-register-step';

  const title5 = document.createElement('h2');
  title5.className = 'auth-modal-title';
  title5.textContent = '¿Qué te interesa?';

  const interestSubtitle = document.createElement('p');
  interestSubtitle.className = 'auth-modal-subtitle';
  interestSubtitle.textContent = 'Elige categorías para personalizar tu feed (opcional).';

  const interestGrid = document.createElement('div');
  interestGrid.className = 'auth-interest-grid';

  const selectedInterests = new Set<string>();

  const interestCounter = document.createElement('div');
  interestCounter.className = 'auth-interest-counter';

  function updateCounter() {
    interestCounter.textContent = `${selectedInterests.size} seleccionadas`;
  }
  updateCounter();

  INTEREST_CATEGORIES.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = 'auth-interest-chip';
    chip.type = 'button';
    chip.innerHTML = `<span class="auth-interest-icon">${cat.icon}</span><span>${cat.label}</span>`;

    chip.addEventListener('click', () => {
      if (selectedInterests.has(cat.id)) {
        selectedInterests.delete(cat.id);
        chip.classList.remove('selected');
      } else {
        selectedInterests.add(cat.id);
        chip.classList.add('selected');
      }
      updateCounter();
    });

    interestGrid.appendChild(chip);
  });

  const registerError = document.createElement('div');
  registerError.className = 'auth-modal-error';

  const createBtn = document.createElement('button');
  createBtn.className = 'auth-modal-submit';
  createBtn.textContent = 'Crear cuenta';

  const back5 = document.createElement('div');
  back5.className = 'auth-modal-back';
  back5.textContent = 'Volver';

  step5.append(title5, interestSubtitle, interestGrid, interestCounter, registerError, createBtn, back5);

  createBtn.addEventListener('click', async () => {
    registerError.classList.remove('visible');

    // Check username availability
    createBtn.disabled = true;
    createBtn.textContent = 'Verificando usuario...';

    const usernameVal = usernameInput.value.trim().toLowerCase();
    const available = await checkUsernameAvailable(usernameVal);
    if (!available) {
      createBtn.disabled = false;
      createBtn.textContent = 'Crear cuenta';
      registerError.textContent = 'El nombre de usuario ya está en uso';
      registerError.classList.add('visible');
      return;
    }

    // Save pending uploads before signUp (user won't have session until email verified)
    createBtn.textContent = 'Creando cuenta...';

    if (avatarFile) {
      try {
        const dataURL = await fileToDataURL(avatarFile);
        savePendingAvatar(dataURL);
      } catch {
        // Ignore compression errors
      }
    }

    if (bannerFile) {
      try {
        const dataURL = await fileToDataURL(bannerFile);
        savePendingBanner(dataURL);
      } catch {
        // Ignore compression errors
      }
    }

    const { data, error } = await signUp({
      email: regEmail.value.trim(),
      password: regPassword.value,
      display_name: displayName.value.trim(),
      username: usernameVal,
      birth_date: birthDate.value,
      bio: bioInput.value.trim(),
      interests: [...selectedInterests],
    });

    createBtn.disabled = false;
    createBtn.textContent = 'Crear cuenta';

    if (error) {
      registerError.textContent = error.message;
      registerError.classList.add('visible');
      return;
    }

    // Check for "email already registered" (Supabase returns user with empty identities)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      registerError.textContent = 'Este correo ya está registrado';
      registerError.classList.add('visible');
      return;
    }

    // Success — go to step 6 (verify email)
    verifyEmailText.textContent = `Hemos enviado un correo de verificación a ${regEmail.value.trim()}. Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.`;
    goToStep(6);
  });
  back5.addEventListener('click', () => goToStep(4));

  // ===========================
  // STEP 6 — Verifica tu correo
  // ===========================
  const step6 = document.createElement('div');
  step6.className = 'auth-register-step';

  const title6 = document.createElement('h2');
  title6.className = 'auth-modal-title';
  title6.textContent = 'Verifica tu correo';

  const verifyIcon = document.createElement('div');
  verifyIcon.className = 'auth-verify-icon';
  verifyIcon.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;

  const verifyEmailText = document.createElement('p');
  verifyEmailText.className = 'auth-modal-subtitle auth-verify-text';
  verifyEmailText.textContent = '';

  const verifyDoneBtn = document.createElement('button');
  verifyDoneBtn.className = 'auth-modal-submit';
  verifyDoneBtn.textContent = 'Entendido';

  step6.append(title6, verifyIcon, verifyEmailText, verifyDoneBtn);

  verifyDoneBtn.addEventListener('click', () => {
    close();
  });

  // ===========================
  // Assemble register form
  // ===========================
  registerForm.append(stepsContainer, step1, step2, step3, step4, step5, step6);

  // Step navigation
  const allSteps = [step1, step2, step3, step4, step5, step6];

  function goToStep(n: number) {
    allSteps.forEach((s, i) => s.classList.toggle('active', i === n - 1));
    dots.forEach((d, i) => d.classList.toggle('active', i === n - 1));
  }

  // =====================
  // ASSEMBLE CARD
  // =====================
  card.append(closeBtn, loginForm, registerForm);
  overlay.appendChild(card);

  // =====================
  // CLOSE BEHAVIOUR
  // =====================
  function close() {
    overlay.classList.remove('open');
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  closeBtn.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      close();
    }
  });

  // =====================
  // RESET helper
  // =====================
  function resetForms() {
    loginEmail.value = '';
    loginPassword.value = '';
    loginError.classList.remove('visible');
    loginSubmit.disabled = false;
    loginSubmit.textContent = 'Entrar';
    regEmail.value = '';
    regPassword.value = '';
    regPasswordConfirm.value = '';
    displayName.value = '';
    usernameInput.value = '';
    birthDate.value = '';
    bioInput.value = '';
    privacyInput.checked = false;
    termsInput.checked = false;
    credError.classList.remove('visible');
    policyError.classList.remove('visible');
    identityError.classList.remove('visible');
    registerError.classList.remove('visible');
    createBtn.disabled = false;
    createBtn.textContent = 'Crear cuenta';
    // Reset avatar
    avatarFile = null;
    avatarPreview.style.display = 'none';
    avatarPlaceholder.style.display = '';
    avatarInput.value = '';
    // Reset banner
    bannerFile = null;
    bannerPreview.style.display = 'none';
    bannerPlaceholder.style.display = '';
    bannerInput.value = '';
    // Reset interests
    selectedInterests.clear();
    interestGrid.querySelectorAll('.auth-interest-chip').forEach(c => c.classList.remove('selected'));
    updateCounter();
    goToStep(1);
  }

  // =====================
  // PUBLIC API
  // =====================
  function showForm(form: 'login' | 'register') {
    resetForms();
    loginForm.classList.toggle('active', form === 'login');
    registerForm.classList.toggle('active', form === 'register');
    overlay.classList.add('open');
  }

  return {
    getElement: () => overlay,
    showLogin: () => showForm('login'),
    showRegister: () => showForm('register'),
    close,
  };
}
