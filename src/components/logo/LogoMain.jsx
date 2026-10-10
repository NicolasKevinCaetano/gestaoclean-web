export default function LogoMain() {
  return (
    <img
      src={`${import.meta.env.BASE_URL}branding/higienizei-logo.png`}
      alt="Higienizei"
      style={{ width: 150, height: 56, objectFit: 'contain', objectPosition: 'center' }}
    />
  );
}
