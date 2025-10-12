package tyche;

import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.layout.VBox;

public class Controller {

    @FXML
    private ToggleButton loginToggle, signupToggle;

    @FXML
    private VBox loginForm, signupForm;

    @FXML
    private TextField signupFullName, signupEmail, loginEmail;

    @FXML
    private PasswordField signupPassword, loginPassword;

    @FXML
    private Button signupButton, loginButton;

    @FXML
    public void initialize() {
        // Default: show signup form
        signupToggle.setSelected(true);
        loginForm.setVisible(false);
        signupForm.setVisible(true);

        // Toggle buttons
        loginToggle.setOnAction(e -> switchForm());
        signupToggle.setOnAction(e -> switchForm());

        // Signup action
        signupButton.setOnAction(e -> handleSignup());

        // Login action
        loginButton.setOnAction(e -> handleLogin());
    }

    private void switchForm() {
        if (loginToggle.isSelected()) {
            signupToggle.setSelected(false);
            loginForm.setVisible(true);
            signupForm.setVisible(false);
        } else {
            signupToggle.setSelected(true);
            loginForm.setVisible(false);
            signupForm.setVisible(true);
        }
    }

    private void handleSignup() {
        String name = signupFullName.getText();
        String email = signupEmail.getText();
        String password = signupPassword.getText();
        System.out.println("Signup: " + name + ", " + email + ", " + password);
    }

    private void handleLogin() {
        String email = loginEmail.getText();
        String password = loginPassword.getText();
        System.out.println("Login: " + email + ", " + password);
    }
}
