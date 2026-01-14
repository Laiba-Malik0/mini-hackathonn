// ==================== Firebase Imports ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, 
  GoogleAuthProvider, signInWithPopup, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, query, orderBy,
  doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp 
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// ==================== Cloudinary ====================
const CLOUDINARY_CLOUD_NAME = "dvur3cxrj"; 
const CLOUDINARY_UPLOAD_PRESET = "blog_upload"; 

// ==================== Firebase Config ====================
const firebaseConfig = {
  apiKey: "AIzaSyBpYiq6H2Jjb58igvMXY9a_n_kBsvrgfDY",
  authDomain: "mini-hackhathon-17cf6.firebaseapp.com",
  projectId: "mini-hackhathon-17cf6",
  storageBucket: "mini-hackhathon-17cf6.appspot.com",
  messagingSenderId: "1012091970008",
  appId: "1:1012091970008:web:e63e22276db8c81dea12ad"
};

// ==================== Initialize Firebase ====================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ==================== DOM Elements ====================
const authSection = document.getElementById("auth-section");
const dashboard = document.getElementById("dashboard");
const blogDetails = document.getElementById("blog-details");
const addEditBlog = document.getElementById("add-edit-blog");

const authForm = document.getElementById("auth-form");
const toggleLink = document.getElementById("toggle-link");
const logoutBtn = document.getElementById("logout");
const addBlogBtn = document.getElementById("add-blog");

const blogList = document.getElementById("blog-list");
const blogForm = document.getElementById("blog-form");
const blogTitle = document.getElementById("blog-title");
const blogText = document.getElementById("blog-text");
const blogCategory = document.getElementById("blog-category");
const coverImage = document.getElementById("cover-image");

const blogContent = document.getElementById("blog-content");
const backToListBtn = document.getElementById("back-to-list");
const editBlogBtn = document.getElementById("edit-blog");
const deleteBlogBtn = document.getElementById("delete-blog");

const searchInput = document.getElementById("search");
const categoryFilter = document.getElementById("category-filter");

// ==================== State ====================
let currentUser = null;
let currentBlogId = null;
let isSignup = false;
let editingBlog = false;

// ==================== Auth State ====================
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if(user){
    authSection.style.display="none";
    dashboard.style.display="block";
    await loadBlogs();
  } else{
    authSection.style.display="flex";
    dashboard.style.display="none";
    blogDetails.style.display="none";
    addEditBlog.style.display="none";
  }
});

// ==================== Toggle Login/Signup ====================
toggleLink.addEventListener("click", (e) => {
  e.preventDefault();
  isSignup = !isSignup;
  document.getElementById("auth-title").textContent = isSignup ? "Join BlogMart" : "Welcome Back";
  document.getElementById("auth-btn").textContent = isSignup ? "Sign Up" : "Login";
  document.getElementById("name").style.display = isSignup ? "block" : "none";
});

// ==================== Auth Form ====================
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const name = document.getElementById("name").value;

  try {
    if(isSignup){
      const userCredential = await createUserWithEmailAndPassword(auth,email,password);
      await setDoc(doc(db,"users",userCredential.user.uid), {
        name,
        email,
        createdAt: Timestamp.now()
      });
      Swal.fire({ icon: 'success', title: 'Account created!', timer:1500, showConfirmButton:false });
      isSignup = false;
      authForm.reset();
    } else{
      await signInWithEmailAndPassword(auth,email,password);
      Swal.fire({ icon: 'success', title: 'Login Successful!', timer:1500, showConfirmButton:false });
    }
  } catch(err){
    Swal.fire({ icon:'error', title:'Error', text: err.message });
  }
});

// ==================== Logout ====================
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  Swal.fire({ icon:'success', title:'Logged out', timer:1000, showConfirmButton:false });
});

// ==================== Add Blog ====================
addBlogBtn.addEventListener("click", () => {
  editingBlog = false;
  addEditBlog.style.display="block";
  dashboard.style.display="none";
  blogForm.reset();
});

// ==================== Back to Dashboard ====================
backToListBtn.addEventListener("click", () => {
  blogDetails.style.display="none";
  dashboard.style.display="block";
  loadBlogs();
});

// ==================== Upload Image ====================
async function uploadImage(file){
  if(!file) return "";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
  const data = await res.json();
  // Resize image for faster loading
  return data.secure_url + "?w=600&h=300&fit=crop";
}

// ==================== Blog Form Submit ====================
blogForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = blogTitle.value.trim();
  const content = blogText.value.trim();
  const category = blogCategory.value;
  const file = coverImage.files[0];

  if(!title || !content || !category) return Swal.fire({ icon:'error', title:'Error', text:'Fill all fields' });

  let imageURL = file ? await uploadImage(file) : "";

  if(editingBlog){
    const snap = await getDoc(doc(db,"blogs",currentBlogId));
    const oldImage = snap.exists()?snap.data().coverImage:"";
    imageURL = imageURL || oldImage;
    await updateDoc(doc(db,"blogs",currentBlogId), { title, content, category, coverImage:imageURL });
    Swal.fire({ icon:'success', title:'Blog Updated!', timer:1500, showConfirmButton:false });
  } else{
    const blogData = { title, content, category, coverImage:imageURL, author:currentUser.email, authorId:currentUser.uid, date:Timestamp.now() };
    await addDoc(collection(db,"blogs"), blogData);
    Swal.fire({ icon:'success', title:'Blog Published!', timer:1500, showConfirmButton:false });
  }

  blogForm.reset();
  addEditBlog.style.display="none";
  dashboard.style.display="block";
  editingBlog=false;
  loadBlogs();
});

// ==================== Load Blogs (Optimized) ====================
async function loadBlogs(){
  blogList.innerHTML = `<div class="d-flex justify-content-center my-5">Loading blogs...</div>`;

  const q = query(collection(db,"blogs"), orderBy("date","desc"));
  const snap = await getDocs(q);
  let blogs = [];
  snap.forEach(docSnap => blogs.push({ id:docSnap.id, ...docSnap.data() }));

  // Filter by search & category
  blogs = blogs.filter(blog => {
    const searchMatch = blog.title.toLowerCase().includes(searchInput.value.toLowerCase()) || blog.content.toLowerCase().includes(searchInput.value.toLowerCase());
    const catMatch = !categoryFilter.value || blog.category === categoryFilter.value;
    return searchMatch && catMatch;
  });

  blogList.innerHTML = "";
  if(blogs.length===0){ 
    blogList.innerHTML="<p class='text-center my-5'>No blogs found</p>"; 
    return; 
  }

  // Append blogs using createElement (faster than innerHTML +=)
  blogs.forEach(blog => {
    const card = document.createElement("div");
    card.className = "blog-card";

    const img = document.createElement("img");
    img.src = blog.coverImage || 'https://via.placeholder.com/600x300';
    img.alt = "cover";
    img.loading = "lazy";

    const title = document.createElement("h3");
    title.textContent = blog.title;

    const p = document.createElement("p");
    p.textContent = blog.content.substring(0, 100) + '...';

    const btn = document.createElement("button");
    btn.textContent = "Read More";
    btn.onclick = () => viewBlog(blog.id);

    card.append(img, title, p, btn);
    blogList.appendChild(card);
  });
}

searchInput.addEventListener("input", loadBlogs);
categoryFilter.addEventListener("change", loadBlogs);

// ==================== View Blog ====================
window.viewBlog = async (id) => {
  const snap = await getDoc(doc(db,"blogs",id));
  if(!snap.exists()) return;
  const blog = snap.data();
  currentBlogId = id;

  blogContent.innerHTML = `
    <h2>${blog.title}</h2>
    <p>✍️ ${blog.author}</p>
    <img src="${blog.coverImage}" class="img-fluid mb-3">
    <p>${blog.content}</p>
  `;

  if(currentUser.uid === blog.authorId){
    editBlogBtn.style.display="inline-block";
    deleteBlogBtn.style.display="inline-block";
  } else{
    editBlogBtn.style.display="none";
    deleteBlogBtn.style.display="none";
  }

  dashboard.style.display="none";
  blogDetails.style.display="block";
};

// ==================== Edit Blog ====================
editBlogBtn.addEventListener("click", async () => {
  const snap = await getDoc(doc(db,"blogs",currentBlogId));
  if(!snap.exists()) return;
  const blog = snap.data();

  editingBlog = true;
  addEditBlog.style.display="block";
  blogDetails.style.display="none";

  blogTitle.value = blog.title;
  blogText.value = blog.content;
  blogCategory.value = blog.category;
});

// ==================== Delete Blog ====================
deleteBlogBtn.addEventListener("click", async () => {
  const res = await Swal.fire({
    title:'Delete this blog?',
    icon:'warning',
    showCancelButton:true,
    confirmButtonText:'Yes',
    cancelButtonText:'Cancel'
  });
  if(res.isConfirmed){
    await deleteDoc(doc(db,"blogs",currentBlogId));
    blogDetails.style.display="none";
    dashboard.style.display="block";
    Swal.fire({ icon:'success', title:'Blog Deleted', timer:1000, showConfirmButton:false });
    loadBlogs();
  }
});
