//
//  TemplateViewController.swift
//  CODEREDASTRA
//
//  A small, reusable UIViewController template for iOS apps.
//  - Includes setup lifecycle methods, layout helpers, basic accessibility, and a SwiftUI preview.
//  - Drop this file into a UIKit-based app and subclass or instantiate directly.
//
//  Contract
//  - Inputs: optional title text via init or `configure(title:)`.
//  - Outputs: user interactions via `onAction: (() -> Void)?` callback.
//  - Error modes: none; UI setup is idempotent and safe to call multiple times.
//
import UIKit

final class TemplateViewController: UIViewController {

    // MARK: - Public API

    /// Callback for primary action (e.g., button tap).
    var onAction: (() -> Void)?

    /// Configure the controller with a title or other data after init.
    func configure(title: String?) {
        titleLabel.text = title
    }

    // MARK: - UI

    private let titleLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = UIFont.preferredFont(forTextStyle: .title2)
        l.textColor = .label
        l.numberOfLines = 0
        l.textAlignment = .center
        l.adjustsFontForContentSizeCategory = true
        l.accessibilityIdentifier = "template.titleLabel"
        return l
    }()

    private let actionButton: UIButton = {
        let b = UIButton(type: .system)
        b.translatesAutoresizingMaskIntoConstraints = false
        b.setTitle("Continue", for: .normal)
        b.titleLabel?.font = UIFont.preferredFont(forTextStyle: .headline)
        b.accessibilityIdentifier = "template.actionButton"
        b.contentEdgeInsets = UIEdgeInsets(top: 12, left: 20, bottom: 12, right: 20)
        b.layer.cornerRadius = 8
        b.clipsToBounds = true
        return b
    }()

    private let stackView: UIStackView = {
        let s = UIStackView()
        s.translatesAutoresizingMaskIntoConstraints = false
        s.axis = .vertical
        s.alignment = .center
        s.distribution = .equalSpacing
        s.spacing = 16
        return s
    }()

    // MARK: - Init

    init(title: String? = nil) {
        super.init(nibName: nil, bundle: nil)
        titleLabel.text = title
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
    }

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        setupViews()
        setupConstraints()
        applyAccessibility()
        applyTheme()
    }

    // MARK: - Setup

    private func setupViews() {
        stackView.addArrangedSubview(titleLabel)
        stackView.addArrangedSubview(actionButton)
        view.addSubview(stackView)

        actionButton.addTarget(self, action: #selector(didTapAction), for: .touchUpInside)
    }

    private func setupConstraints() {
        NSLayoutConstraint.activate([
            stackView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stackView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stackView.leadingAnchor.constraint(greaterThanOrEqualTo: view.layoutMarginsGuide.leadingAnchor),
            stackView.trailingAnchor.constraint(lessThanOrEqualTo: view.layoutMarginsGuide.trailingAnchor),
            titleLabel.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, multiplier: 0.9),
            actionButton.widthAnchor.constraint(lessThanOrEqualToConstant: 300)
        ])
    }

    // MARK: - Actions

    @objc private func didTapAction() {
        // Toggle a brief animation for affordance
        UIView.animate(withDuration: 0.12, animations: {
            self.actionButton.alpha = 0.6
        }, completion: { _ in
            UIView.animate(withDuration: 0.12) {
                self.actionButton.alpha = 1.0
            }
            self.onAction?()
        })
    }

    // MARK: - Theming & Accessibility

    private func applyTheme() {
        // Keep theme simple; override or subclass to customize.
        actionButton.backgroundColor = UIColor { trait in
            trait.userInterfaceStyle == .dark ? UIColor.systemBlue.withAlphaComponent(0.85) : UIColor.systemBlue
        }
        actionButton.setTitleColor(.white, for: .normal)
    }

    private func applyAccessibility() {
        titleLabel.isAccessibilityElement = true
        actionButton.isAccessibilityElement = true

        titleLabel.accessibilityTraits = .header
        actionButton.accessibilityTraits = .button

        // Provide helpful accessibility labels if the developer hasn't set any custom text
        if (titleLabel.text ?? "").isEmpty {
            titleLabel.accessibilityLabel = "Title"
        }
        if (actionButton.title(for: .normal) ?? "").isEmpty {
            actionButton.accessibilityLabel = "Continue"
        }
    }

    // MARK: - Debug

    deinit {
        #if DEBUG
        print("TemplateViewController deinitialized")
        #endif
    }
}

#if canImport(SwiftUI) && DEBUG
import SwiftUI

/// A lightweight preview helper for UIViewController in SwiftUI previews.
struct TemplateViewController_Previews: PreviewProvider {
    static var previews: some View {
        ViewControllerPreview(TemplateViewController(title: "Welcome to Code Red Astra"))
            .edgesIgnoringSafeArea(.all)
            .previewDisplayName("TemplateViewController")
    }
}

private struct ViewControllerPreview<ViewController: UIViewController>: UIViewControllerRepresentable {
    let viewController: ViewController

    init(_ viewController: ViewController) {
        self.viewController = viewController
    }

    func makeUIViewController(context: Context) -> ViewController { viewController }
    func updateUIViewController(_ uiViewController: ViewController, context: Context) { /* no-op */ }
}
#endif
