const fs = require('fs');
let code = fs.readFileSync('ProductFormScreen.tsx', 'utf8');

// Replace FormGroup required
code = code.replace(/const FormGroup = \(\{\s*label,\s*required,\s*children,\s*actionRight,\s*width\s*\}\:\s*any\)\s*=>\s*\([\s\S]*?\{label\} \{required && <Text style=\{styles\.required\}>\*<\/Text>\}\n\s*<\/Text>/, 
`const FormGroup = ({ label, children, actionRight, width }: any) => (
  <View style={[styles.formGroup, width ? { width } : null]}>
    <View style={styles.labelRow}>
      <Text style={styles.label}>
        {label}
      </Text>`);

// Remove required props from usages
code = code.replace(/ required/g, '');

// Replace SelectField definition and usages
code = code.replace(/const SelectField =[\s\S]*?<\/TouchableOpacity>\s*\);/g, '');
code = code.replace(/<SelectField placeholder=(["'])(.*?)\1 \/>/g, '<AppSelect placeholder=$1$2$1 containerStyle={{ marginBottom: 0 }} />');

// Replace InputField definition and usages
code = code.replace(/const InputField =[\s\S]*?<\/View>\s*\);/g, '');
code = code.replace(/<InputField \/>/g, '<AppInput containerStyle={{ marginBottom: 0 }} />');
code = code.replace(/<InputField actionBtn=(["'])(.*?)\1 \/>/g, '<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{flex: 1}}><AppInput containerStyle={{ marginBottom: 0 }} /></View><AppButton title=$1$2$1 style={{ borderRadius: 6, height: 48 }} /></View>');

// Replace radio buttons with AppRadio
code = code.replace(/<View style=\{styles\.radioGroup\}>[\s\S]*?<\/View>\n\s*<\/FormGroup>/, 
`<View style={styles.radioGroup}>
  <AppRadio label="Single Product" selected={productType === 'single'} onPress={() => setProductType('single')} />
  <AppRadio label="Variable Product" selected={productType === 'variable'} onPress={() => setProductType('variable')} />
</View>
</FormGroup>`);

fs.writeFileSync('ProductFormScreen.tsx', code);
