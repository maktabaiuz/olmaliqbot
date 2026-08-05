export function generateLoginCode(): string {
  // 6-digit unique numeric code (100000 - 999999)
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateTempPassword(): string {
  // 6-letter readable lowercase password avoiding ambiguous letters (o, l, i, z)
  const charset = 'abcdefghjkmnpqrstuvwxy';
  let password = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}
