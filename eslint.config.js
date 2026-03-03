import { globalIgnores } from "../../eslint.base.mjs";

export default [
    globalIgnores,
    {
        files: ["*.ts", "*.mjs"], // Only lint root config files
        rules: { /* minimal rules */ }
    }
];